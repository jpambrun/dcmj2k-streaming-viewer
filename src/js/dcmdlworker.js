/*global JpxImage, dicomParser, PDFJS, self, importScripts, XMLHttpRequest, Uint8Array*/
'use strict';
importScripts('jpx.js', 'util.js', 'arithmetic_decoder.js', 'dicomparser.js');

var jpxImage = new JpxImage();
self.onmessage = function(e) {
    var prefetchSize = 20000;
    var url = e.data;
    var xhr = new XMLHttpRequest();
    var startDlTime = Date.now();
    xhr.open("GET", url, false); // false makes this synchronous
    xhr.setRequestHeader('Range', 'bytes=0-' + (prefetchSize -1)); // the bytes (incl.) you request
    xhr.responseType = 'arraybuffer';
    xhr.send(); // Blocks until response is complete
    if ( !(xhr.status === 200 || xhr.status === 206) ) { // Throw an error if request failed
        throw Error(xhr.status + " " + xhr.statusText + ": " + url);
    }

    var dcmData = new Uint8Array(xhr.response);
    var dataSet = dicomParser.parseDicom(dcmData);
    var deltaDcmData;
    var newDcmData;
    var endPos = '';

    var imageBaseOffset;
    if(dataSet.elements.x00691011 !== undefined){
      imageBaseOffset = dataSet.uint32('x00691011');
      var layerOffset = dataSet.uint32('x00691012');
      endPos = imageBaseOffset + layerOffset;
    }else{
      imageBaseOffset = dataSet.elements.x7fe00010.dataOffset + 1;
      endPos = dataSet.elements.x7fe00010.dataOffset + dataSet.elements.x7fe00010.length-16;
    }

    if(endPos > dcmData.length){
      xhr = new XMLHttpRequest();
      xhr.open("GET", url, false); // false makes this synchronous
      xhr.responseType = 'arraybuffer';
      xhr.setRequestHeader('Range', 'bytes=' + prefetchSize + '-' + endPos ); // the bytes (incl.) you request
      xhr.send(); // Blocks until response is complete
      if ( xhr.status !== 206 ) { // Throw an error if request failed
        throw Error(xhr.status + " " + xhr.statusText + ": " + url);
      }
      deltaDcmData = new Uint8Array(xhr.response);
      newDcmData = new Uint8Array(dcmData.length + deltaDcmData.length);
      newDcmData.set(dcmData, 0);
      newDcmData.set(deltaDcmData, dcmData.length);
      dcmData = newDcmData;
    }


    var endDlTime = Date.now();
    dataSet = dicomParser.parseDicom(dcmData.subarray(0, endPos));
    var parsedDicomData = {
        patientName: dataSet.string('x00100020'),
        rescaleIntercept: dataSet.floatString('x00281052'),
        rescaleSlope: dataSet.floatString('x00281053'),
        sliceLocation: dataSet.floatString('x00201041'),
        imageBaseOffset:  dataSet.uint32('x00691011'),
        layer: [
          dataSet.uint32('x00691012'),
          dataSet.uint32('x00691013'),
          dataSet.uint32('x00691014')
        ],
    };
    var jpxData = dataSet.byteArray.subarray(imageBaseOffset, endPos);

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
        jpxData: jpxData.buffer,
        width: width,
        height: height,
        fileSize: fileSize,
        decodeTime: decodeTime,
        downloadTime: dlTime,
        url: url,
        parsedDicomData: parsedDicomData,
        loadedLayers: 1,
    }, [pixelData.buffer, jpxData.buffer]);
};
