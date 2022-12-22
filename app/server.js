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
        console.log(result)
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

async function search_drawing_by_name(drawing_title, jessionid) {
  return new Promise((resolve, reject) => {
    var req = unirest('GET', 'https://3dspace.yenaplus.com/3dspace/resources/v1/modeler/dsdrw/dsdrw:Drawing/Search?tenant=OnPremise&$searchStr=' + drawing_title + '&$mask=dsmvdrw:DrawingMask.Details&$top=100&$skip=0')
      .headers({
        'Content-Type': 'application/json',
        'SecurityContext': 'VPLMProjectLeader.Company Name.Common Space',
        'Cookie': 'JSESSIONID=' + jessionid
      }).jar(true)
      .end(function (res) {
        if (res.error) reject(res.error)
        var drawing = JSON.parse(res.raw_body)
        var drawing_id = drawing.member[0].id
        resolve(drawing_id)
      });
  })
}

async function get_derived_output_filename(drawing_physical_id,csrf,jsessionid) {
  return new Promise((resolve, reject) => {
    var req = unirest('GET', 'https://3dspace.yenaplus.com/3dspace/resources/v1/modeler/dsdo/dsdo:DerivedOutputs/' + drawing_physical_id)
      .headers({
        'Content-Type': 'application/json',
        'SecurityContext': 'VPLMProjectLeader.Company Name.Common Space',
        'ENO_CSRF_TOKEN': csrf,
        'Cookie': 'JSESSIONID=' + jsessionid
      })
      .end(function (res) { 
        if (res.error) reject(res.error)
        var derived_output = JSON.parse(res.raw_body)
        var derived_output_filename = derived_output.member[0].derivedOutputs.derivedOutputfiles[0].id
        resolve(derived_output_filename)
      });
  })
}

//TODO 
/*
var unirest = require('unirest');
var req = unirest('POST', 'https://3dspace.yenaplus.com/3dspace/resources/v1/modeler/dsdo/dsdo:DerivedOutputs/2A4934B300007118639AD6B90000C24C/dsdo:DerivedOutputFiles/PDF_2a4934b3_7c7c_639ad947_bba2_Drawing00000097.PDF/DownloadTicket')
  .headers({
    'Content-Type': 'application/json',
    'SecurityContext': 'VPLMProjectLeader.Company Name.Common Space',
    'ENO_CSRF_TOKEN': 'F17S-9RDF-OD2D-TYC8-EQG2-SIR1-KXEQ-NYBN',
    'Cookie': 'JSESSIONID=ACB4CA197C4E3F51865AA7D82350D172'
  })
  .end(function (res) { 
    if (res.error) throw new Error(res.error); 
    console.log(res.raw_body);
  });

*/

// MAIN FUNCTION - RUN ASYNC REQUEST BY ORDER
async function get_derived_output() {
  var jsessionid
  const login_ticket = await get_login_ticket()
  console.log("Login Success : " + login_ticket)
  const authent = await get_authentication(login_ticket)
  // console.log("Auth : " + authent)
  const jsession = await get_service_redirect(login_ticket)
  const csrf_token = await get_csrf_token(jsession);
  console.log("CSRF Token : " + csrf_token)
  const drawing_id = await search_drawing_by_name("drw-80139888-00000097", jsession);
  console.log("Drawing ID :" + drawing_id)
  const derived_output_filename = await get_derived_output_filename(drawing_id,csrf_token,jsession)
  console.log("File ID :" + derived_output_filename)
}



// Routes
app.get('/', (req, res) => {
  res.send("Derived Format Integration Service");
  get_derived_output()
})

app.listen(PORT, HOST, () => {
  console.log("Derived Output Integration Service Started on " + PORT);
})



