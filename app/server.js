'use strict';

// IMPORTS
const express = require('express');
const unirest = require('unirest');
const crtCAS = require('ssl-root-cas').create();


// SERVER 
const server_3dpassport_service = "https://3dpassport.yenaplus.com/3dpassport"
const server_3dspace_service = "https://3dspace.yenaplus.com/3dspace"
const server_username = "mirac.cicek"
const server_password = "enoviaV6"
const server_rememberme = "no"

//CAS CERTIFICATE VERIFICATION
crtCAS.addFile(__dirname + '/cacert.crt');
require('https').globalAgent.options.ca = crtCAS;

//COOKIE MANAGEMENT
var MyJar = unirest.jar()


// CONSTS 
const app = express();
const PORT = 8085;
const HOST = '0.0.0.0';


// ASYNC FUNCTIONS
async function get_login_ticket() {
  return new Promise((resolve, reject) => {
    let resObj
    let url = server_3dpassport_service + "/login?action=get_auth_params";
    unirest.get(url)
      .headers({
        'Accept': 'application/json',
      })
      .end(function (res) {
        if (res.error) reject(res.error)
        resObj = JSON.parse(res.raw_body)
        resolve(resObj.lt)
      })
  })
}

async function get_authentication(loginTicket) {
  return new Promise((resolve, reject) => {
    var req = unirest('POST', 'https://3dpassport.yenaplus.com/3dpassport/login')
      .headers({
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      }).jar(true).followRedirect(false)
      .send('lt=' + loginTicket)
      .send('username=mirac.cicek')
      .send('password=enoviaV6')
      .send('rememberMe=no')
      .end(function (res) {
        if (res.error) reject(res.error)
        resolve(res.raw_body)
      })
  })
}

async function get_service_redirect(loginTicket) {
  return new Promise((resolve, reject) => {
    var req = unirest('GET', 'https://3dpassport.yenaplus.com/3dpassport/login?service=https://3dspace.yenaplus.com/3dspace/resources/modeler/pno/person?current=true%26tenant=OnPremise%26select=collabspaces%26select=preferredcredentials')
      .headers({
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Accept': 'application/json',
        'Cookie': 'CASTGC=TGT-28-C1dVeD5dMWlRiIXRz25gycLDQQUa2Fzx0XXO5fBlEFMlfTp5bd-cas;'
      }).jar(true)
      .send('lt=' + loginTicket)
      .send('username=mirac.cicek')
      .send('password=enoviaV6')
      .send('rememberMe=no')

      .end(function (res) {
        if (res.error) reject(res.error)
        var get_user_context = JSON.parse(res.raw_body)
        var user_context = get_user_context.preferredcredentials.collabspace.name + "." + get_user_context.preferredcredentials.organization.name + "." + get_user_context.preferredcredentials.role.name
        var result = get_user_context.name + " - " + user_context
        var jsession = res.cookie("JSESSIONID");
        resolve(jsession)
      });

  })
}

async function get_csrf_token(jsessionid) {
  return new Promise((resolve, reject) => {
    var req = unirest('GET', 'https://3dspace.yenaplus.com/3dspace/resources/v1/application/CSRF?tenant=OnPremise')
      .headers({
        'Cookie': 'JSESSIONID=' + jsessionid
      }).jar(true)
      .end(function (res) {
        if (res.error) reject(res.error)
        var csrf_token = JSON.parse(res.raw_body)
        resolve(csrf_token.csrf.value)
      });

  })
}


// MAIN FUNCTION FOR ASYNC REQUESTS
async function get_derived_output() {
  var jsessionid
  const login_ticket = await get_login_ticket()
  console.log("Login Success : " + login_ticket)
  const authent = await get_authentication(login_ticket)
  const jsession = await get_service_redirect(login_ticket)
  const csrf_token = await get_csrf_token(jsession);
  console.log(csrf_token)
}

// Routes
app.get('/', (req, res) => {
  res.send("Test1");
  get_derived_output()
})

app.listen(PORT, HOST, () => {
  console.log("Derived Output RestAPI Integration Service Started ... - 2022");
  console.log(PORT + " listening....")
})



