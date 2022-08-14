function GenerateLivePhtos(){
    const LivePhotos = document.getElementsByClassName("LivePhoto");

    for(const element of LivePhotos){
        //add listeners for desktop users
        element.children[1].addEventListener("mouseover", function () {
            StartLivePlay(element.children[1], element.children[0]);
        });

        element.children[1].addEventListener("mouseout", function () {
            StopLivePlay(element.children[1], element.children[0]);
        });

        element.children[1].addEventListener("click", function(){
            EnlargePhoto(element.children[1], element.children[0]);
        });

        //adds listens for mobile users
        element.children[1].addEventListener("touchstart", function () {
            StartLivePlay(element.children[1], element.children[0]);
            var startTime = new Date();
            element.children[1].addEventListener("touchend", function () {
                StopLivePlay(element.children[1], element.children[0]);
                var endTime = new Date();
                if (endTime.getTime() - startTime.getTime() < 1000) {
                    EnlargePhoto(element.children[1], element.children[0]);
                }
            });
        });
    }
}

function EnlargePhoto(image, video){
    //Test2();
    console.log("Photo Enlarged"+image.id);
    //Test2();
}


function StartLivePlay(image, video) {
    image.style.opacity = "0"
    video.muted = true;
    video.loop = true;
    video.play();
}
function StopLivePlay(image, video) {
    image.style.opacity = ""
    video.muted = true;
    video.loop = false;
    video.pause();
} 

//prevents Long Click dialogs for mobile users
function absorbEvent_(event) {
    var e = event || window.event;
    e.preventDefault && e.preventDefault();
    e.stopPropagation && e.stopPropagation();
    e.cancelBubble = true;
    e.returnValue = false;

    return false;
}

preventLongPressMenu(document.getElementsByClassName('LivePhoto'));

function preventLongPressMenu(nodes) {
    for (var i = 0; i < nodes.length; i++) {
        nodes[i].ontouchstart = absorbEvent_;
        nodes[i].ontouchmove = absorbEvent_;
        nodes[i].ontouchend = absorbEvent_;
        nodes[i].ontouchcancel = absorbEvent_;
    }
}