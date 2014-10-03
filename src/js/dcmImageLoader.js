var dcmdlworker;
var imageLoaderCallback;
var workerCount = 0;
var numWorker = 4;

function jpxReceiver(e) {
    var pixelData = new Int16Array(e.data.pixelData);
    var width = e.data.width;
    var height = e.data.height;
    var imageId = e.data.url;
    var parsedDicomData = e.data.parsedDicomData;

    var image = {
        imageId: imageId,
        minPixelValue: -1100,
        maxPixelValue: 2500,
        slope: parsedDicomData.rescaleSlope,
        intercept: parsedDicomData.rescaleIntercept,
        windowCenter: -600,
        windowWidth: 1600,
        render: cornerstone.renderGrayscaleImage,
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
        compressedFileSize: e.data.fileSize,
        downloadTime: e.data.downloadTime,
        decodingTime: e.data.decodeTime,
        sizeInBytes: width * height * 2,
        patientName: parsedDicomData.patientName,
        sliceLocation: parsedDicomData.sliceLocation,
    };
    cornerstone.imageCache.putImage(imageId, image);
    imageLoaderCallback();
}

function loadImage(url, callback) {

    if (dcmdlworker === undefined) {
        dcmdlworker = [];
        for (var i = 0; i < numWorker; i++) {
            dcmdlworker[i] = new Worker('js/dcmdlworker.js');
            dcmdlworker[i].onmessage = jpxReceiver;
        }
    }
    imageLoaderCallback = callback;
    dcmdlworker[workerCount % numWorker].postMessage(url);
    workerCount++;
}
