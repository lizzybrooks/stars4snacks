let signInButton, logoutButton, commentInput, saveCommentButton;
let userName = "";
let comments = []; // Array to store comments fetched from Firebase

let font;

let video;
let canvas;
let context;
const targetQRCode = "https://idemia-mobile-id.com/testqr-success"; // The specific QR code content to react to

let stars = []; // Array to hold positions of stars


function preload() {
    font = loadFont('BebasNeue-Regular.ttf');
}

function setup() {
    canvas = createCanvas(windowWidth, windowHeight);
    canvas.id('p5canvas');
    pixelDensity(displayDensity()); // Optimize for the screen density

    // Define camera constraints based on device type
    let constraints;
    if (isMobileDevice()) {
        console.log("Using rear-facing camera");
        constraints = {
            video: {
                facingMode: "environment"  // Rear-facing camera on mobile
            }
        };
    } else {
        console.log("Using front-facing camera");
        constraints = {
            video: {
                facingMode: "user"  // Front-facing camera on desktop
            }
        };
    }

    video = createCapture(constraints, function (stream) {
        console.log('Video stream started');
    });
    video.size(windowWidth / 2, windowHeight / 2);
    video.hide(); // Hide the video element, and just show the canvas
    context = canvas.elt.getContext('2d');

    textFont(font);
    textSize(min(windowWidth, windowHeight) / 10); // Adjust text size based on the smaller screen dimension
    textAlign(CENTER, CENTER);

    // Initialize UI elements
    initUI();


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

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function initUI() {
    signInButton = createButton('Sign In with Google');
    signInButton.position(20, 20);
    signInButton.mousePressed(signInWithGoogle);
    signInButton.style('font-size', '16px');

    logoutButton = createButton('Logout');
    logoutButton.position(windowWidth - logoutButton.width - 20, 20);
    logoutButton.mousePressed(signOut);
    logoutButton.hide();
    logoutButton.style('font-size', '16px');

    // Adjust these UI positions as needed
}


function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    textSize(min(windowWidth, windowHeight) / 10); // Adjust text size when window is resized
}

function draw() {
    background(220);
    // Show welcome message near logout button if user is signed in
    if (userName) {
        fill(0);
        textSize(16); // Smaller text size
        textAlign(RIGHT, TOP);
        text(`Welcome ${userName}`, windowWidth - 30, 15);

        image(video, windowWidth / 4, windowHeight / 4, windowWidth / 2, windowHeight / 2);
        drawInteractiveElements(); // Handles stars and messages






    }
}

function drawInteractiveElements() {
    noStroke();
    fill(220);
    rect(0, windowHeight - 100, windowWidth, 100); // Adjusted for mobile

    if (stars.length < 5) {
        displayStars();
        scanAndReact(); // Continue scanning until 5 stars are reached
    } else {
        displayRedeemMessage(); // Display redeem message
    }

    // Text settings for "STARS" and "SNACKS"
    textSize(min(windowWidth, windowHeight) / 25); // Adjust text size dynamically
    textAlign(CENTER, CENTER);
    fill(120);
    text("STARS", windowWidth / 2, windowHeight - 80);
    fill("255, 255, 0");
    text(stars.length.toString(), windowWidth / 2 + 50, windowHeight - 80); // Display number of stars
    fill(120);
    text("SNACKS", windowWidth / 2, windowHeight - 60);
}

function displayStars() {


    for (let i = 0; i < stars.length; i++) {
        // Dynamically position stars based on window size
        drawStar(100 + i * 100, windowHeight - 50, 30, 70, 5);
    }

}

function scanAndReact() {
    context.drawImage(video.elt, width / 4, height / 4, width / 2, height / 2);
    let imageData = context.getImageData(width / 4, height / 4, width / 2, height / 2);
    let code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code && code.data === targetQRCode) {
        stars.push({ x: 80 + 100 * stars.length }); // Add new star
        if (stars.length < 5) {
            // Update star count in Firebase
            saveStarsToFirebase(stars.length);
            noLoop(); // Pause only if under 5 stars
            setTimeout(() => {
                loop(); // Resume after 10 seconds
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
    textSize(64); // Large text size
    fill('green'); // Green text color
    textAlign(CENTER, CENTER);
    text('REDEEM', width / 2, height / 2); // Centered text over the video
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
