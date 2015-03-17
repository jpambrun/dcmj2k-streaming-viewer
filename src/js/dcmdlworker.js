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

/*global parseImageId, JpxImage, dicomParser, PDFJS, self, importScripts, XMLHttpRequest, Uint8Array*/
'use strict';
importScripts('jpx.js', 'utils.js', 'dicomparser.js');

var jpxImage = new JpxImage();
var prefetchSize = 20000;


self.onmessage = function (e) {
    var loadedLayers;
    var parsedDicomData;
    var jpxData;
    var j2kStreamTruncationPoint;
    var xhr;
    var dcmData;
    var newDcmData;
    var deltaDcmData;
    var imageId = e.data.imageId;
    var parsedId = parseImageId(imageId);
    var startTime;
    var endTime;
    var stats = {
        downloadTime: 0,
        dicomParseTime: 0,
        j2kDecodeTime: 0,
        fileSize: 0,
        isUpdate: NaN,
    };


    if (e.data.oldDcmData === undefined) {
        stats.isUpdate = false;
        // no data from this image yet. We first download [prefetchSize] bytes and decode the
        // DICOM header. If the private tags are not present we download the entire file.
        // Otherwise, issue another partial request to fetch the first layer is we don't
        // already have enough. The private tags are :
        //   (0069,1012) truncation offset of layer 1 from the beginning of j2k codestream
        //   (0069,1013) truncation offset of layer 2 from the beginning of j2k codestream
        //   (0069,1013) truncation offset of layer 3 from the beginning of j2k codestream

        startTime = Date.now();
        xhr = new XMLHttpRequest();
        xhr.open("GET", parsedId.url, false);
        xhr.setRequestHeader('Range', 'bytes=0-' + (prefetchSize - 1));
        xhr.responseType = 'arraybuffer';
        xhr.send();
        if (!(xhr.status === 200 || xhr.status === 206)) {
            throw Error(xhr.status + " " + xhr.statusText + ": " + parsedId.url);
        }
        endTime = Date.now();
        stats.downloadTime += (endTime - startTime);

        stats.fileSize = xhr.response.byteLength;
        dcmData = new Uint8Array(xhr.response);

        startTime = Date.now();
        var dataSet = dicomParser.parseDicom(dcmData);

        parsedDicomData = {
            patientName: dataSet.string('x00100020'),
            rescaleIntercept: dataSet.floatString('x00281052'),
            rescaleSlope: dataSet.floatString('x00281053'),
            sliceLocation: dataSet.floatString('x00201041'),
            numberOfLayers: 1,
            imageBaseOffset: dataSet.elements.x7fe00010.dataOffset + 16,
            layers: [],
        };

        if (dataSet.elements.x00691011 !== undefined) {
            for (var i = 1; i < 3 || dataSet.uint32('x0069101' + (i + 1)) !== 0; i++) {
                parsedDicomData.numberOfLayers = i;
            }
            parsedDicomData.layers = [
                dataSet.uint32('x00691012'),
                dataSet.uint32('x00691013'),
                dataSet.uint32('x00691014')
            ];
            var layerOffset = parsedDicomData.layers[parsedId.requestedQuality - 1];
            j2kStreamTruncationPoint = parsedDicomData.imageBaseOffset + layerOffset;
        } else {
            // TODO: testing required.
            j2kStreamTruncationPoint = Infinity;
        }
        endTime = Date.now();
        stats.dicomParseTime += (endTime - startTime);

        if (j2kStreamTruncationPoint > dcmData.length) {

            startTime = Date.now();
            xhr = new XMLHttpRequest();
            xhr.open("GET", parsedId.url, false);
            xhr.responseType = 'arraybuffer';
            if (isFinite(j2kStreamTruncationPoint)) {
                xhr.setRequestHeader('Range', 'bytes=' + prefetchSize + '-' + j2kStreamTruncationPoint);
            } else {
                xhr.setRequestHeader('Range', 'bytes=' + prefetchSize + '-'); // download till EOF.
            }
            xhr.send();
            if (xhr.status !== 206) {
                throw Error(xhr.status + " " + xhr.statusText + ": " + parsedId.url);
            }
            endTime = Date.now();
            stats.downloadTime += (endTime - startTime);
            stats.fileSize += xhr.response.byteLength;
            deltaDcmData = new Uint8Array(xhr.response);
            newDcmData = new Uint8Array(dcmData.length + deltaDcmData.length);
            newDcmData.set(dcmData, 0);
            newDcmData.set(deltaDcmData, dcmData.length);
            dcmData = newDcmData;
        }

        jpxData = dcmData.subarray(parsedDicomData.imageBaseOffset, j2kStreamTruncationPoint);
        loadedLayers = 1;
    } else {
        // This is an update. The message contains the already downloaded data (oldDcmData).
        // We just need to download the range between that and the next truncation point.
        stats.isUpdate = true;
        parsedDicomData = e.data.parsedDicomData;
        var oldDcmData = new Uint8Array(e.data.oldDcmData);
        // TODO: check param e.data.layers.
        j2kStreamTruncationPoint = parsedDicomData.imageBaseOffset + parsedDicomData.layers[parsedId.requestedQuality - 1];


        startTime = Date.now();
        xhr = new XMLHttpRequest();
        xhr.open("GET", parsedId.url, false);
        xhr.responseType = 'arraybuffer';
        xhr.setRequestHeader('Range', 'bytes=' + oldDcmData.length + '-' + j2kStreamTruncationPoint);
        xhr.send();
        if (xhr.status !== 206) {
            throw Error(xhr.status + " " + xhr.statusText + ": " + parsedId.url);
        }
        endTime = Date.now();
        stats.downloadTime += (endTime - startTime);

        stats.fileSize = xhr.response.byteLength;

        deltaDcmData = new Uint8Array(xhr.response);
        dcmData = new Uint8Array(oldDcmData.length + deltaDcmData.length);
        dcmData.set(oldDcmData, 0);
        dcmData.set(deltaDcmData, oldDcmData.length);

        jpxData = dcmData.subarray(parsedDicomData.imageBaseOffset, j2kStreamTruncationPoint);
        loadedLayers = parsedId.requestedQuality;
    }

    startTime = Date.now();
    jpxImage.parse(jpxData);
    endTime = Date.now();
    stats.j2kDecodeTime += (endTime - startTime);

    var width = jpxImage.width;
    var height = jpxImage.height;
    var componentsCount = jpxImage.componentsCount;
    var tileCount = jpxImage.tiles.length;
    var tileComponents = jpxImage.tiles[0];
    var pixelData = tileComponents.items;
    self.postMessage({
        workerId: e.data.workerId,
        pixelData: pixelData.buffer,
        dcmData: dcmData.buffer,
        width: width,
        height: height,
        imageId: imageId,
        parsedDicomData: parsedDicomData,
        loadedLayers: loadedLayers,
        stats: stats,
    }, [pixelData.buffer, dcmData.buffer]);
};
