var cornerstoneDCMJ2KImageLoader = (function ($, cornerstone, cornerstoneDCMJ2KImageLoader) {

    if(cornerstoneDCMJ2KImageLoader === undefined) {
        cornerstoneDCMJ2KImageLoader = {};
    }

    var dcmdlworker;
    var dcmdlworkerDeferred={};
    var imageLoaderCallback;
    var workerCount = 0;
    var numWorker = 4;

    if (dcmdlworker === undefined) {
            dcmdlworker = [];
            for (var i = 0; i < numWorker; i++) {
                dcmdlworker[i] = new Worker('js/dcmdlworker.js');
            }
    }

    function loadImage(imageId) {
        var deferred = $.Deferred();
        var url = imageId;
        url = url.substring(7);

        dcmdlworkerDeferred[imageId] = deferred;
        dcmdlworker[workerCount % numWorker].onmessage = function(e){
            dcmdlworker[workerCount % numWorker].removeEventListener("message", arguments.callee, false);
            var pixelData = new Int16Array(e.data.pixelData);
            var width = e.data.width;
            var height = e.data.height;
            var imageId = "dcmj2k:" + e.data.url;
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
            console.log("resolve "+ image.imageId);
            dcmdlworkerDeferred[imageId].resolve(image);

            if(imageLoaderCallback !== undefined){
                imageLoaderCallback();
            }
        };
        dcmdlworker[workerCount % numWorker].postMessage(url);
        workerCount++;
        return deferred;
    }


    function setCallback(callback){
        imageLoaderCallback = callback;
    }

    cornerstone.registerImageLoader('dcmj2k', loadImage);

    // module exports
    cornerstoneDCMJ2KImageLoader.setCallback = setCallback;

    return cornerstoneDCMJ2KImageLoader;
}($, cornerstone, cornerstoneDCMJ2KImageLoader));