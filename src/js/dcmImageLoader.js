/*global getParameterByName*/

var cornerstoneDCMJ2KImageLoader = (function ($, cornerstone, cornerstoneDCMJ2KImageLoader) {

    if (cornerstoneDCMJ2KImageLoader === undefined) {
        cornerstoneDCMJ2KImageLoader = {};
    }

    var workerPool;
    var workerMessageQueue = [];
    var workerReady = [];
    var dcmdlworkerDeferred = {};
    var statisticCallbacl;
    var numWorker = 8;

    if (workerPool === undefined) {
        workerPool = [];
        for (var i = 0; i < numWorker; i++) {
            workerPool[i] = new Worker('js/dcmdlworker.js');
            workerPool[i].onmessage = handleWorkerMessage;
            workerReady[i] = true;
        }
    }

    function loadImage(imageId) {
        var deferred = $.Deferred();
        var parsedId = parseImageId(imageId);


        //is it already in cache?
        var cachedImagePromise;
        for (var i = parsedId.requestedQuality - 1; i >= 1 && cachedImagePromise === undefined; i--) {
            cachedImagePromise = cornerstone.imageCache.getImagePromise(parsedId.scheme + ':' + parsedId.url + '?quality=' + i);
        }

        dcmdlworkerDeferred[imageId] = deferred;
        var firstAvailableWorker = workerReady.indexOf(true);

        if (cachedImagePromise !== undefined) {
            cachedImagePromise.then(function (image) {
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
            compressedFileSize: e.data.fileSize,
            downloadTime: e.data.downloadTime,
            decodingTime: e.data.decodeTime,
            sizeInBytes: dcmData.length + pixelData.length * 2,
            loadedLayers: loadedLayers,
            parsedDicomData: parsedDicomData,
        };

        if (statisticCallbacl !== undefined) {
            statisticCallbacl();
        }

        var deferred = dcmdlworkerDeferred[imageId];
        delete dcmdlworkerDeferred[imageId];

        // check is queue is empty
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

    function setCallback(callback) {
        statisticCallbacl = callback;
    }

    cornerstone.registerImageLoader('dcmj2k', loadImage);

    // module exports
    cornerstoneDCMJ2KImageLoader.setCallback = setCallback;

    return cornerstoneDCMJ2KImageLoader;
}($, cornerstone, cornerstoneDCMJ2KImageLoader));
