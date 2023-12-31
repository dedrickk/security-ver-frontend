const express = require('express');
const session = require('express-session');
const { OAuthContext } = require('ibm-verify-sdk');
const path = require('path');
const app = express();

app.use(session({
  secret: 'my-secret',
  resave: true,
  saveUninitialized: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// Serve static files from the 'front-end' directory
app.use(express.static('front-end'));


// Load contents of .env into process.env
require('dotenv').config();

const config = {
  tenantUrl: process.env.TENANT_URL,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI,
  responseType: process.env.RESPONSE_TYPE,
  flowType: process.env.FLOW_TYPE,
  scope: process.env.SCOPE
};

const authClient = new OAuthContext(config);

// Home route
app.get('/', (req, res) => {
  if (req.session.token) {
    res.redirect("/dashboard");
  } else {
    // Send the HTML file for the index page
    res.sendFile(path.join(__dirname, 'front-end', 'index.html'));
  }
});

app.get('/login', (req, res) => {
  authClient.authenticate().then((url) => {
    console.log(`======== Authentication redirect to:\n ${url}`);
    res.redirect(url);
  }).catch(error => {
    console.log('There was an error with the authentication process:', error);
    res.send(error);
  });
});

app.get(process.env.REDIRECT_URI_ROUTE, (req, res) => {
  authClient.getToken(req.url).then(token => {
    token.expiry = new Date().getTime() + (token.expires_in * 1000);
    console.log("======== Token details:");
    console.log(token);
    req.session.token = token;
    res.redirect('/dashboard');
  }).catch(error => {
    res.send("ERROR: " + error);
  });
});

app.get('/dashboard', (req, res) => {
  if (req.session.token) {
    console.log('======== Requesting userInfo claims using valid token');
    authClient.userInfo(req.session.token)
      .then((response) => {
        // Send the HTML file for the dashboard page
        res.sendFile(path.join(__dirname, 'front-end', 'dashboard.html'));
      }).catch((err) => {
        res.json(err);
      });
  } else {
    console.log('======== Current session had no token available.')
    res.redirect('/login')
  }
});

// Delete token from storage when logging out
app.get('/logout', (req, res) => {
  if (!req.session.token) {
    console.log('======== No token stored in session')
    res.redirect('/');
    return;
  }
  console.log('======== Attempting to revoke access_token')
  authClient.revokeToken(req.session.token, 'access_token')
    .then(() => {
      console.log('======== Successfully revoked access token');
      delete req.session.token;
      console.log('======== Deleting token session');
      console.log('======== Logout session successful');
      res.redirect('/');
    })
    .catch((err) => {
      console.log('======== Error revoking token: ', err)
      res.redirect('/');
    });
});

app.listen(8000, () => {
  console.log('Server started');
  console.log('Navigate to http://localhost:3000');
});

app.listen(3000, () => {
  console.log('Server started');
  console.log('Navigate to http://localhost:3000');
});
