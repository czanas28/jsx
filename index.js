require("dotenv").config(); //Stores confidential data and global variables
const jsxapi = require('jsxapi'); //The Cisco JS API library
const axios = require('axios'); //Easy API requests
const parseString = require('xml2js').parseString; //CMS API returns XML, this module converts it to JSON
const deviceList = require('./deviceList') //External file used for storing the devices that connect to this script

// Creates an axios api connection to CMS
const cms = axios.create({
    baseURL: process.env.CMS_URL,
    auth: {
        username: process.env.CMS_API_USER,
        password: process.env.CMS_API_PASSWORD
    }
});
// deviceList.hostnameOrIp[d]
// Loop through all devices on the external device list
for (let d = 0; d < deviceList.hostnameOrIp.length; d++) {
    // Establishes the connection to each device
    jsxapi.connect({
        host: deviceList.hostnameOrIp[d],
        username: process.env.TP_DEVICE_USER,
        password: process.env.TP_DEVICE_PASSWORD
    })
    .on('ready', (xapi) => {

    const domain = process.env.DOMAIN;
    let uri = '';
    let passcode = '';

    // The CMS server responds with XML. This function converts it to JSON.
    function parseCoSpace(res) {
        const xml = res.data;
        parseString(xml, (err, result) => {
            uri = result.coSpace.uri;
            passcode = result.coSpace.passcode;
            return uri, passcode;
        })
    };

    // Dials the URI
    function dial(number) {
        let dialedNum = `${number}${domain}`
        let now = new Date();
        console.log(`${deviceList.hostnameOrIp[d]} is calling ${dialedNum} at ${now}`);
        xapi.Command.Dial
        ({ Number: dialedNum });
    }

    // Sends the PIN
    function sendTouchTones() {
        xapi.Command.Call.DTMFSend({ DTMFString: `${passcode}#` });
    };

    // Queries the CMS API
    function checkApi(clickedWidget) {
        cms.get(`/coSpaces/${clickedWidget}`)
            .then((res) => {
                parseCoSpace(res);
            })
    };

    // Listens for GUI events
    function listenToGui() {
        xapi.Event.UserInterface.Extensions.Widget.Action.on((event) => {
            if (event.Type === 'clicked') {
                let clickedWidget = event.WidgetId;
                checkApi(clickedWidget);
                setTimeout(() => {
                    if (uri) {
                        dial(uri)
                            setTimeout(() => {
                                sendTouchTones()
                            }, 1500)
                        }
                }, 250)
            }
        });        
    };

listenToGui();

console.log(`Successfully connected to`, deviceList.hostnameOrIp[d]);

})
.on('error', (err) => {
    console.error(`Connection failed on ${deviceList.hostnameOrIp[d]} - ${err}, exiting`);
})
};


// Add If to check on panel id's
// Check out Zoom API integration
