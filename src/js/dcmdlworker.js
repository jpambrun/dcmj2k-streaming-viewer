/*global JpxImage, dicomParser, PDFJS, self, importScripts, XMLHttpRequest, Uint8Array*/
'use strict';
importScripts('jpx.js', 'util.js', 'arithmetic_decoder.js', 'dicomparser.js');

var jpxImage = new JpxImage();
self.onmessage = function(e) {
    var url = e.data;
    var xhr = new XMLHttpRequest();
    var startDlTime = Date.now();
    xhr.open("GET", url, false); // false makes this synchronous
    xhr.responseType = 'arraybuffer';
    xhr.send(); // Blocks until response is complete
    if (xhr.status !== 200) { // Throw an error if request failed
        throw Error(xhr.status + " " + xhr.statusText + ": " + url);
    }
    var endDlTime = Date.now();
    var dcmData = new Uint8Array(xhr.response);
    var dataSet = dicomParser.parseDicom(dcmData);
    var parsedDicomData = {
        patientName: dataSet.string('x00100020'),
        rescaleIntercept: dataSet.floatString('x00281052'),
        rescaleSlope: dataSet.floatString('x00281053'),
        sliceLocation: dataSet.floatString('x00201041'),
    };
    var jpxData = dataSet.byteArray.subarray(dataSet.elements.x7fe00010.dataOffset + 16, dataSet.elements.x7fe00010.dataOffset + dataSet.elements.x7fe00010.length-16);

    var dlTime = (endDlTime - startDlTime);
    var startDecodeTime = Date.now();
    jpxImage.parse(jpxData);
    var endDecodeTime = Date.now();
    var decodeTime = (endDecodeTime - startDecodeTime);
    var fileSize = Math.round(jpxData.length / 1024);
    var width = jpxImage.width;
    var height = jpxImage.height;
    var componentsCount = jpxImage.componentsCount;
    var tileCount = jpxImage.tiles.length;
    var tileComponents = jpxImage.tiles[0];
    var pixelData = tileComponents.items;
    self.postMessage({
        pixelData: pixelData.buffer,
        width: width,
        height: height,
        fileSize: fileSize,
        decodeTime: decodeTime,
        downloadTime: dlTime,
        url: url,
        parsedDicomData: parsedDicomData
    }, [pixelData.buffer]);
};
