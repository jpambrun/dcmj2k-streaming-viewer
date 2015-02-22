/* Copyright (c) 2015, Jean-Francois Pambrun
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.  */

/*global getParameterByName*/

var cornerstoneDCMJ2KImageLoader = (function ($, cornerstone, cornerstoneDCMJ2KImageLoader) {

    if (cornerstoneDCMJ2KImageLoader === undefined) {
        cornerstoneDCMJ2KImageLoader = {};
    }

    // We can't pass deferred object to workers, so we must stored them temporarily.
    var dcmdlworkerDeferred = {};

    // Optional progress callback that provide statistics.
    var progressCallback;

    // Multiple worker are spawned in a pool and reused as needed.
    // This is essential since spawning workers is expensive.
    var workerPool;
    var workerMessageQueue = [];
    var workerReady = [];
    var numWorker = 8;
    if (workerPool === undefined) {
        workerPool = [];
        for (var i = 0; i < numWorker; i++) {
            workerPool[i] = new Worker('js/dcmdlworker.js');
            workerPool[i].onmessage = handleWorkerMessage;
            workerReady[i] = true;
        }
    }

    // Exposed load function. Accepts urls with query string of the following format :
    // a) dcmj2k://example.com/data/file.dcm
    //    In this operation mode, the codestream is completely decoded.
    //
    // b) dcmj2k://example.com/data/file.dcm?quality=x
    //    Where x is a predefined quality layer. The DICOM file must have a special
    //    private tags to signal the location of the j2k codestream and valid
    //    truncation points.
    function loadImage(imageId) {
        var deferred = $.Deferred();
        var parsedId = parseImageId(imageId);

        //Is this an update (i.e. do we have a previous layer in cache)?
        var cachedImagePromise;
        for (var i = parsedId.requestedQuality - 1; i >= 1 && cachedImagePromise === undefined; i--) {
            cachedImagePromise = cornerstone.imageCache.getImagePromise(parsedId.scheme + ':' + parsedId.url + '?quality=' + i);
        }

        // Temporarily store deferred objects.
        dcmdlworkerDeferred[imageId] = deferred;

        // Check if we already have some data from previous layers on this image. If we do,
        // it will be passed in the message. The message is sent immediately to any available
        // worker or put on the queue. Image update requests are placed at the top of the queue
        // while new images are process in FIFO order.
        var firstAvailableWorker = workerReady.indexOf(true);
        if (cachedImagePromise !== undefined) {
            cachedImagePromise.then(function (image) {
                cornerstone.imageCache.removeImagePromise(image.imageId);
                var oldDcmData = new Uint8Array(image.getDcmData());
                var message = {
                    imageId: imageId,
                    parsedDicomData: image.parsedDicomData,
                    oldDcmData: oldDcmData,
                };
                if (firstAvailableWorker === -1) {
                    //start of queue, image updates are a priority
                    workerMessageQueue.unshift(message);
                } else {
                    message.workerId = firstAvailableWorker;
                    workerReady[firstAvailableWorker] = false;
                    workerPool[firstAvailableWorker].postMessage(message, [oldDcmData.buffer]);
                }
            });
        } else {
            var message = {
                imageId: imageId,
            };
            if (firstAvailableWorker === -1) {
                // put at end of queue
                workerMessageQueue.push(message);
            } else {
                message.workerId = firstAvailableWorker;
                workerReady[firstAvailableWorker] = false;
                workerPool[firstAvailableWorker].postMessage(message);
            }
        }

        return deferred;
    }

    function handleWorkerMessage(e) {
        var pixelData = new Int16Array(e.data.pixelData);
        var dcmData = new Uint8Array(e.data.dcmData);
        var width = e.data.width;
        var height = e.data.height;
        var imageId = e.data.imageId;
        var loadedLayers = e.data.loadedLayers;
        var parsedDicomData = e.data.parsedDicomData;
        var parsedId = parseImageId(imageId);

        var image = {
            imageId: imageId,
            minPixelValue: -1100,
            maxPixelValue: 2500,
            windowCenter: -600,
            windowWidth: 1600,
            render: cornerstone.renderGrayscaleImage,
            getDcmData: function getDcmData() {
                return dcmData;
            },
            getPixelData: function getPixelData() {
                return pixelData;
            },
            rows: width,
            columns: height,
            height: height,
            width: width,
            color: false,
            columnPixelSpacing: 0.8984375,
            rowPixelSpacing: 0.8984375,
            slope: parsedDicomData.rescaleSlope,
            intercept: parsedDicomData.rescaleIntercept,
            sizeInBytes: dcmData.length + pixelData.length * 2,
            loadedLayers: loadedLayers,
            parsedDicomData: parsedDicomData,
        };

        if (progressCallback !== undefined) {
            progressCallback(e.data.stats);
        }

        var deferred = dcmdlworkerDeferred[imageId];
        delete dcmdlworkerDeferred[imageId];

        // check is queue is empty. If not, start working on the next image immediately.
        // Otherwise, set worker in ready mode.
        if (workerMessageQueue.length !== 0) {
            var message = workerMessageQueue.shift();
            message.workerId = e.data.workerId;
            if (message.hasOwnProperty('oldDcmData')) {
                workerPool[e.data.workerId].postMessage(message, [message.oldDcmData.buffer]);
            } else {
                workerPool[e.data.workerId].postMessage(message);
            }
        } else {
            workerReady[e.data.workerId] = true;
        }

        deferred.resolve(image);
    }

    function setProgressCallback(callback) {
        progressCallback = callback;
    }

    cornerstone.registerImageLoader('dcmj2k', loadImage);

    // module exports
    cornerstoneDCMJ2KImageLoader.setProgressCallback = setProgressCallback;

    return cornerstoneDCMJ2KImageLoader;
}($, cornerstone, cornerstoneDCMJ2KImageLoader));
