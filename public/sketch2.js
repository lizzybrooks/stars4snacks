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
    canvas = createCanvas(640, 480);
    canvas.id('p5canvas');
    pixelDensity(1);
    video = createCapture(VIDEO);
    video.size(width / 2, height / 2);
    video.hide(); // Hide the video element, and just show the canvas
    context = canvas.elt.getContext('2d');
    textFont(font);
    textSize(64);
    textAlign(CENTER, CENTER);

    // Initialize the "Sign in with Google" button
    signInButton = createButton('Sign In with Google');
    signInButton.position(20, 20);
    signInButton.mousePressed(signInWithGoogle);

    // Initialize the logout button but hide it initially
    logoutButton = createButton('Logout');
    logoutButton.position(height - 120, 20); // Upper right corner
    logoutButton.mousePressed(signOut);
    logoutButton.hide();


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
    // Show welcome message near logout button if user is signed in
    if (userName) {
        fill(0);
        textSize(16); // Smaller text size
        textAlign(RIGHT, TOP);
        text(`Welcome ${userName}`, windowWidth - 30, 15);

        image(video, width / 4, height / 4, width / 2, height / 2);

        noStroke();
        fill(220);
        rect(0, 400, width, 100); // Clean up area for stars
        if (stars.length < 5) {
            displayStars();
            scanAndReact(); // Continue scanning until 5 stars are reached
        } else {
            displayRedeemMessage(); // Display redeem message
        }

        for (let i = 0; i < stars.length; i++) {
            drawStar(stars[i].x, 400, 30, 70, 5); // Draw each star at its stored x-position
        }
        textSize(64); // Large text size

        textAlign(CENTER, CENTER);
        fill(120);
        text("STARS ", 150, 50); // Draw "STARS " in white
        fill("255, 255, 0"); // Set fill color to yellow for the number 4
        text("4", 225, 50); // Draw the number 4 in yellow
        fill(120);
        text(" SNACKS", 150, 110); // Draw " SNACKS" in white
    }
}

function displayStars() {
    for (let i = 0; i < stars.length; i++) {
        drawStar(stars[i].x, 400, 30, 70, 5);
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
