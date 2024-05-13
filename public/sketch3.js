let signInButton, logoutButton, commentInput, saveCommentButton;
let userName = "";
let comments = []; // Array to store comments fetched from Firebase

let font;

let video;
let canvas;
let context;
const targetQRCode = "https://idemia-mobile-id.com/testqr-success"; // The specific QR code content to react to

let stars = []; // Array to hold positions of stars
let starYposition; 


function preload() {
    font = loadFont('BebasNeue-Regular.ttf');
}


function setup() {
    canvas = createCanvas(windowWidth, windowHeight); // Use window dimensions
    canvas.id('p5canvas');
    pixelDensity(1); // Adjust pixel density for high-res devices

    // Define default camera as front-facing
    let constraints = {
        video: {
            facingMode: "environment" // 'user' for front camera, 'environment' for back camera
        }
    };

    // Create video capture with constraints
    video = createCapture(constraints, function (stream) {
        console.log('Camera is ready.');
    });

    video.size(width / 2, height / 2); // Adjust based on new canvas size
    video.hide();

    // Adjust button positions based on screen size
    signInButton = createButton('Sign In with Google');
    signInButton.position(20, 20);

    logoutButton = createButton('Logout');
    logoutButton.position(windowWidth - 100, 20); // Adjust for right corner based on width
    logoutButton.hide();

    switchCamButton = createButton('Switch Camera');
    switchCamButton.position(20, windowHeight - 50); // Position at the bottom
    switchCamButton.mousePressed(toggleCamera);

    context = canvas.elt.getContext('2d');
    textFont(font);
    textSize(windowHeight / 15); // Scale text size based on window height
    textAlign(CENTER, CENTER);

     starYPosition = windowHeight - 80; // Positioned 80 pixels from the bottom

    // Authentication state observer
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            signInButton.hide();
            logoutButton.show();
            fetchStars(user.uid);
            userName = user.displayName || "User";
            fetchComments(); // Fetch existing comments from Firebase
        } else {
            signInButton.show();
            logoutButton.hide();
            stars = [];
            userName = "";
        }
    });
}


function draw() {
    background(220);
    textSize(windowHeight / 30); // Adjust text size dynamically
    textAlign(RIGHT, TOP);
    text(`Welcome ${userName}`, windowWidth - 30, 15);

    image(video, width / 4, height / 4, width / 2, height / 2); // Center video in the canvas

    // Adjust rectangle size for stars display
    fill(220);
    rect(0, windowHeight - 80, windowWidth, 80); // Make this bar stick to the bottom

    displayStars();
    scanAndReact();

    if (stars.length == 5) {
        displayRedeemMessage();
    }

    // Draw stars at a scaled position
    for (let i = 0; i < stars.length; i++) {
        drawStar(stars[i].x, windowHeight - 80, 30, 70, 5); // Adjust y-position to near bottom
    }

    // Adjust text size for "STARS SNACKS" display
    textSize(windowHeight / 15);
    fill("255, 255, 0");
    textAlign(CENTER, CENTER);
    text("STARS 4 SNACKS", windowWidth / 2, 60); // Center this text at the top
}






// Function to toggle the camera between front and back
function toggleCamera() {
    let currentFacingMode = video.elt.srcObject.getVideoTracks()[0].getSettings().facingMode;
    let newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    video.remove(); // Remove the current video stream

    // Set the new constraints for the opposite camera
    let constraints = {
        video: {
            facingMode: newFacingMode
        }
    };

    // Create new capture with updated constraints
    video = createCapture(constraints);
    video.size(width / 2, height / 2);
    video.hide();
}

function displayStars() {
    for (let i = 0; i < stars.length; i++) {
        drawStar(stars[i].x, windowHeight - 80, 30, 70, 5);
    }

}
function scanAndReact() {
    context.drawImage(video.elt, width / 4, height / 4, width / 2, height / 2);
    let imageData = context.getImageData(width / 4, height / 4, width / 2, height / 2);
    let code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code && code.data === targetQRCode) {
        stars.push({ x: 80 + 100 * stars.length }); // Add new star
        if (stars.length < 5) {
            // Update star count in Firebase and pause for new stars accumulation
            saveStarsToFirebase(stars.length);
            noLoop(); // Pause the loop
            setTimeout(() => {
                loop(); // Resume the loop after 10 seconds
            }, 10000); // 10000 milliseconds = 10 seconds
        
        } 
        
        else if(stars.length == 5){
            displayRedeemMessage()
            saveStarsToFirebase(stars.length);
            noLoop(); // Pause the loop
            setTimeout(() => {
                loop(); // Resume the loop after 10 seconds
            }, 10000); // 10000 milliseconds = 10 seconds
        }
        
        else if (stars.length > 5) {
            // Reset the stars array if it reaches 5 stars
            stars = [];
            saveStarsToFirebase(0); // Send a reset count to Firebase
            noLoop(); // Pause the loop
            setTimeout(() => {
                loop(); // Resume the loop after 10 seconds
            }, 10000); // 10000 milliseconds = 10 seconds
        }
    }
}


function saveStarsToFirebase(starCount) {
    const userId = firebase.auth().currentUser.uid;
    firebase.database().ref('users/' + userId).set({
        username: userName,
        stars: starCount,
    }).then(() => {
        console.log("Stars updated successfully.");
    }).catch((error) => {
        console.error("Error updating stars:", error.message);
    });
}

function fetchStars(userId) {
    firebase.database().ref('users/' + userId).once('value').then((snapshot) => {
        const data = snapshot.val();
        if (data && data.stars) {
            stars = Array(data.stars).fill().map((_, i) => ({ x: 80 + 100 * i }));
        } else {
            stars = [];
        }
        redraw(); // Refresh display to show stars
    }).catch((error) => {
        console.error("Error fetching stars:", error.message);
    });
}

function drawStar(x, y, radius1, radius2, npoints) {
    fill("gold");
    let angle = TWO_PI / npoints;
    let halfAngle = angle / 2.0;
    beginShape();
    for (let i = 0; i < TWO_PI; i += angle) {
        let sx = x + cos(i) * radius2;
        let sy = y + sin(i) * radius2;
        vertex(sx, sy);
        sx = x + cos(i + halfAngle) * radius1;
        sy = y + sin(i + halfAngle) * radius1;
        vertex(sx, sy);
    }
    endShape(CLOSE);
}

function displayRedeemMessage() {
    textSize(windowHeight / 10); // Large text size dynamically scaled
    fill('green');
    textAlign(CENTER, CENTER);
    text('REDEEM', windowWidth / 2, windowHeight / 2); // Center text on screen
}



function signInWithGoogle() {
    let provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch((error) => {
        console.error("Error during sign-in:", error.message);
    });
}

function signOut() {
    firebase.auth().signOut().catch((error) => {
        console.error("Sign out error:", error.message);
    });
}

function saveComment() {
    const comment = commentInput.value();
    const userId = firebase.auth().currentUser.uid;
    // Save the comment to Firebase; adjust the path as necessary for your data structure
    firebase.database().ref('comments/' + userId).push({
        username: userName,
        comment: comment,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        console.log("Comment saved successfully.");
        commentInput.value(''); // Clear the input after saving
    }).catch((error) => {
        console.error("Error saving comment:", error.message);
    });
}
