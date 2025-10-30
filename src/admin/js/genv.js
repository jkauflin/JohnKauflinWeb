/*==============================================================================
(C) Copyright 2024 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Main module to handle interactions with database and update
                of genv components on the web page.  Module
                uses chart.js library included in the main web page
--------------------------------------------------------------------------------
Modification History
2024-05-17 JJK  Initial version - moved metrics components to this module
2024-06-14 JJK  Test deploy
2024-06-23 JJK  Added AmpMaxValue and WattMaxValue to the Totals query and 
                display of last 10 values in a table
2024-12-06 JJK  Added util module and loading spinner (and corrected 
                getDateDayInt for the correct day buckets in metrics)
2025-03-26 JJK  Modified to accept start and end hours from screen inputs
2025-04-02 JJK  Working on start and stop date and time - realized it was more
                complicated to convert to datetime and use date match functions
                Just kept it simple with a start date and start & stop hours
2025-04-12 JJK  Adding average calculations
2025-05-21 JJK  Adding GenvMonitor components
2025-05-23 JJK  Checking error handling
2025-05-28 JJK  Added autoSetOn
2025-05-30 JJK  Added requestCommand for water seconds (*** need to RE-DO this ***)
2025-06-20 JJK  Adding notes and a way to create new Config records
2025-07-01 JJK  Adding Genv History (to display, select, and create Config recs)
2025-07-04 JJK  Working to switch to cloud db as primary datasource again, and
                putting updates in this web app.  Pi app just reads from main
                and puts it's data into the MetricPoint records.
                Also implementing the stages concept for setting watering
2025-07-05 JJK  Implemented GenvConfig update (and date re-calcs)
2025-07-09 JJK  Implementing history display to choose previous configs
2025-07-23 JJK  Implemented commandRequestSwitch to allow for commands to be sent
2025-10-30 JJK  Commented out queryGenvMetrics until I can get it converted to
                Function API
================================================================================*/

import {empty,showLoadingSpinner,checkFetchResponse,convertUTCDateToLocalDate,
    formatDate,addDays,addHours,getDateInt,getDateDayInt,getHoursInt,daysFromDate} from './util.js';

const dailyTempCanvas = document.getElementById("DailyTempCanvas")
var dailyTempChart = null
var metricsStartDate = document.getElementById("MetricsStartDate")
var startHour = document.getElementById("StartHour")
var stopHour = document.getElementById("StopHour")
var getMetricsButton = document.getElementById("GetMetricsButton")
var getMetricsButtonHTML = '<i class="fa fa-area-chart me-1"></i> Get Metrics'
getMetricsButton.innerHTML = getMetricsButtonHTML
getMetricsButton.addEventListener("click", queryGenvMetrics);

var currDT = new Date()
metricsStartDate.value = currDT.toISOString().split('T')[0];
startHour.value = 0
stopHour.value = 24

// GenvMonitor elements
var updId = document.getElementById("updId")
var configId = document.getElementById("configId")
var configDesc = document.getElementById("configDesc")
var notes = document.getElementById("notes")
var daysToGerm = document.getElementById("daysToGerm")
var daysToBloom = document.getElementById("daysToBloom")
var germinationStart = document.getElementById("germinationStart")
var plantingDate = document.getElementById("plantingDate")
var harvestDate = document.getElementById("harvestDate")
var cureDate = document.getElementById("cureDate")
var productionDate = document.getElementById("productionDate")
var targetTemperature = document.getElementById("targetTemperature")
var currTemperature = document.getElementById("currTemperature")
var airInterval = document.getElementById("airInterval")
var airDuration = document.getElementById("airDuration")
var heatInterval = document.getElementById("heatInterval")
var heatDuration = document.getElementById("heatDuration")
var lightDuration =  document.getElementById("lightDuration")
var waterInterval = document.getElementById("waterInterval")
var waterDuration = document.getElementById("waterDuration")
var lastWaterTs = document.getElementById("lastWaterTs")
var lastWaterSecs = document.getElementById("lastWaterSecs")
var logMetricInterval = document.getElementById("logMetricInterval")

var lastUpdateTs = document.getElementById("lastUpdateTs")
var messageDisplay = document.getElementById("MessageDisplay")
var imgDisplay = document.getElementById("ImgDisplay")
var waterSeconds = document.getElementById("waterSeconds")

var s0day = document.getElementById("s0day")
var s0waterDuration = document.getElementById("s0waterDuration")
var s0waterInterval = document.getElementById("s0waterInterval")
var s1day = document.getElementById("s1day")
var s1waterDuration = document.getElementById("s1waterDuration")
var s1waterInterval = document.getElementById("s1waterInterval")
var s2day = document.getElementById("s2day")
var s2waterDuration = document.getElementById("s2waterDuration")
var s2waterInterval = document.getElementById("s2waterInterval")
var s3day = document.getElementById("s3day")
var s3waterDuration = document.getElementById("s3waterDuration")
var s3waterInterval = document.getElementById("s3waterInterval")
var s4day = document.getElementById("s4day")
var s4waterDuration = document.getElementById("s4waterDuration")
var s4waterInterval = document.getElementById("s4waterInterval")
var s5day = document.getElementById("s5day")
var s5waterDuration = document.getElementById("s5waterDuration")
var s5waterInterval = document.getElementById("s5waterInterval")
var s6day = document.getElementById("s6day")
var s6waterDuration = document.getElementById("s6waterDuration")
var s6waterInterval = document.getElementById("s6waterInterval")

var GenvFormData = document.getElementById("GenvFormData")
const GenvConfigHistoryModal = new bootstrap.Modal(document.getElementById('GenvConfigHistoryModal'))

var getDataButton = document.getElementById("GetDataButton")
var updateButton = document.getElementById("UpdateButton")
var waterButton = document.getElementById("WaterButton")
var GetSelfieButton = document.getElementById("GetSelfieButton")
var GenvTabButton = document.getElementById("GenvTabButton")
var GetHistoryButton = document.getElementById("GetHistoryButton")
var TakeSelfieButton = document.getElementById("TakeSelfieButton")
var RebootButton = document.getElementById("RebootButton")
var RequestsButton = document.getElementById("RequestsButton")
var currDay = document.getElementById("currDay")

var loggingSwitch = document.getElementById("loggingSwitch")
var imagesSwitch = document.getElementById("imagesSwitch")
var commandRequestSwitch = document.getElementById("commandRequestSwitch")
loggingSwitch.checked = false;
imagesSwitch.checked = false;
commandRequestSwitch.checked = false;


//=================================================================================================================
// Bind events
getDataButton.addEventListener("click", _lookup);
updateButton.addEventListener("click", updateGenvConfig);
waterButton.addEventListener("click", _water);
GetSelfieButton.addEventListener("click", _getSelfie);
TakeSelfieButton.addEventListener("click", takeSelfie);
RebootButton.addEventListener("click", requestReboot);
RequestsButton.addEventListener("click", getRequests);

GenvTabButton.addEventListener("click", function () {
    let targetTabElement = document.querySelector(`.navbar-nav a[href="#GenvPage"]`);
    if (typeof targetTabElement !== "undefined" && targetTabElement !== null) {
        bootstrap.Tab.getOrCreateInstance(targetTabElement).show();
    }
});

GetHistoryButton.addEventListener("click",  getGenvConfigHistory);


// Respond to any clicks in the document and check for specific classes to respond to
// (Do it dynamically because elements with classes will be added to the DOM dynamically)
document.body.addEventListener('click', function (event) {
    //console.log("event.target.classList = "+event.target.classList)
    // Check for specific classes
    if (event.target && event.target.classList.contains("GenvConfigHistoryLookup")) {
        event.preventDefault();
        let genvConfigId = event.target.dataset.configId
        getGenvConfig(genvConfigId)
        GenvConfigHistoryModal.hide();
    }
})


 //=================================================================================================================
 // Module methods
await _lookup()
async function _lookup(event) {
    showLoadingSpinner(messageDisplay)
    // Just default to get the last record when page loads
    getGenvConfig()
    getGenvMetricPoint()
}

async function updateGenvConfig() {
    messageDisplay.textContent = "Updating GenvConfig..."
    try {
        const response = await fetch("/api/UpdateGenvConfig", {
            method: "POST",
            body: new FormData(GenvFormData)
        })
        await checkFetchResponse(response)
        // Success
        let cr = await response.json()
        messageDisplay.textContent = "Update successful "
        _renderConfig(cr);

    } catch (err) {
        console.error(err)
        messageDisplay.textContent = `Error in Fetch: ${err.message}`
    }
}

async function getGenvConfig(genvConfigId) {
    try {
        const response = await fetch("/api/GetGenvConfig", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: genvConfigId
        })
        await checkFetchResponse(response)
        // Success
        let genvConfigList = await response.json()
        if (genvConfigList.length > 0) {
            // Get the last one
            let cr = genvConfigList[genvConfigList.length - 1]
            messageDisplay.textContent = "GenvConfig loaded"
            _renderConfig(cr);
        } else {
            messageDisplay.textContent = "No GenvConfig records found"
        }   
    } catch (err) {
        console.error(err)
        messageDisplay.textContent = `Error in Fetch: ${err.message}`
    }
}

async function getGenvConfigHistory() {
    let genvConfigId = "History"
    messageDisplay.textContent = "Getting History..."
    try {
        const response = await fetch("/api/GetGenvConfig", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: genvConfigId
        })
        await checkFetchResponse(response)
        // Success
        let genvConfigList = await response.json()
        if (genvConfigList.length > 0) {
            messageDisplay.textContent = ""
            formatGenvConfigHistory(genvConfigList)
        } else {
            messageDisplay.textContent = "No GenvConfig records found"
        }   

    } catch (err) {
        console.error(err)
        messageDisplay.textContent = `Error in Fetch: ${err.message}`
    }
}

function formatGenvConfigHistory(genvConfigList) {
    empty(GenvConfigHistoryTbody)

    let tr = ''
    let th = ''
    let td = ''
    let tbody = ''

    tbody = GenvConfigHistoryTbody
    tr = document.createElement('tr')
    tr.classList.add('small')
    // Append the header elements
    th = document.createElement("th"); th.textContent = "Id"; tr.appendChild(th)
    th = document.createElement("th"); th.textContent = "Desc"; tr.appendChild(th)
    th = document.createElement("th"); th.textContent = "Germ"; tr.appendChild(th)
    th = document.createElement("th"); th.textContent = "Planting"; tr.appendChild(th)
    //th = document.createElement("th"); th.classList.add('d-none','d-md-table-cell'); th.textContent = "Date Purchased"; tr.appendChild(th)
    tbody.appendChild(tr)

    // Append a row for every record in list
    for (let index in genvConfigList) {
        let cr = genvConfigList[index]

        tr = document.createElement('tr')
        tr.classList.add('small')

        let a = document.createElement("a")
        a.href = ""
        a.classList.add("GenvConfigHistoryLookup")
        a.dataset.configId = cr.configId
        a.textContent = cr.configId
        td = document.createElement("td"); 
        td.appendChild(a);
        tr.appendChild(td)

        td = document.createElement("td"); td.textContent = cr.configDesc; tr.appendChild(td)
        td = document.createElement("td"); td.textContent = cr.germinationStart; tr.appendChild(td)
        td = document.createElement("td"); td.textContent = cr.plantingDate; tr.appendChild(td)
        //td = document.createElement("td"); td.classList.add('d-none','d-md-table-cell'); td.textContent = standardizeDate(ownerRec.datePurchased); tr.appendChild(td)

        tbody.appendChild(tr)
    }
    
    GenvConfigHistoryModal.show();
}


async function getGenvMetricPoint() {
    try {
        const response = await fetch("/api/GetGenvMetricPoint", {
            method: "GET"
        })
        await checkFetchResponse(response)
        // Success
        let gmp = await response.json()
        _renderGenvMetricPoint(gmp);
    } catch (err) {
        console.error(err)
        messageDisplay.textContent = `Error in Fetch: ${err.message}`
    }
}

async function _getSelfie(event) {
    showLoadingSpinner(messageDisplay)
    try {
        const response = await fetch("/api/GetGenvSelfie", {
            method: "GET"
        })
        await checkFetchResponse(response)
        // Success
        messageDisplay.textContent = ""
        imgDisplay.src = await response.text()
    } catch (err) {
        console.error(err)
        messageDisplay.textContent = `Error in Fetch: ${err.message}`
    }
}

function _water() {
    let paramData = {
        ConfigId: parseInt(configId.value), // Partition key (1)
        RequestCommand: "WaterOn",
        RequestValue: waterSeconds.value
    }
    requestCommand(paramData)
}

function takeSelfie() {
    let paramData = {
        ConfigId: parseInt(configId.value), // Partition key (1)
        RequestCommand: "TakeSelfie",
        RequestValue: ""
    }
    requestCommand(paramData)
}

function requestReboot() {
    let paramData = {
        ConfigId: parseInt(configId.value), // Partition key (1)
        RequestCommand: "REBOOT",
        RequestValue: ""
    }
    requestCommand(paramData)
}

function getRequests() {
    console.log("getRequests() called")
}

async function requestCommand(paramData) {
    showLoadingSpinner(messageDisplay)

    try {
        const response = await fetch("/api/GenvRequestCommand", {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paramData)
        })
        await checkFetchResponse(response)
        // Success
        messageDisplay.textContent = await response.text()
    } catch (err) {
        console.error(err)
        messageDisplay.textContent = `Error in Fetch: ${err.message}`
    }
}

/*
 function displayImage() {
     // {imgId: 1221, lastChangeTs: '2024-01-04 00:56:06', imgData: '
     messageDisplay.innerHTML = "ImgTS: "+imgArray[currImg].lastChangeTs+" ("+imgArray[currImg].imgId+")"
     imgDisplay.src = imgArray[currImg].imgData
 }
*/

function _renderConfig(cr) {
    if (cr != null) {
        updId.value = cr.id
        configId.value = cr.configId
        configDesc.value = cr.configDesc
        notes.value = cr.notes
        daysToGerm.value = cr.daysToGerm
        daysToBloom.value = cr.daysToBloom
        germinationStart.value = cr.germinationStart
        plantingDate.value = cr.plantingDate

        let days = daysFromDate(cr.plantingDate)
        currDay.textContent = "Curr Day: " + days

        harvestDate.value = cr.harvestDate
        cureDate.value = cr.cureDate
        productionDate.value = cr.productionDate
        logMetricInterval.value = cr.logMetricInterval
        targetTemperature.value = cr.targetTemperature
        airInterval.value = cr.airInterval
        airDuration.value = cr.airDuration
        heatInterval.value = cr.heatInterval
        heatDuration.value = cr.heatDuration
        lightDuration.value = cr.lightDuration

        s0day.value = cr.s0day
        s0waterDuration.value = cr.s0waterDuration
        s0waterInterval.value = cr.s0waterInterval
        s1day.value = cr.s1day
        s1waterDuration.value = cr.s1waterDuration
        s1waterInterval.value = cr.s1waterInterval
        s2day.value = cr.s2day
        s2waterDuration.value = cr.s2waterDuration
        s2waterInterval.value = cr.s2waterInterval
        s3day.value = cr.s3day
        s3waterDuration.value = cr.s3waterDuration
        s3waterInterval.value = cr.s3waterInterval
        s4day.value = cr.s4day
        s4waterDuration.value = cr.s4waterDuration
        s4waterInterval.value = cr.s4waterInterval
        s5day.value = cr.s5day
        s5waterDuration.value = cr.s5waterDuration
        s5waterInterval.value = cr.s5waterInterval
        s6day.value = cr.s6day
        s6waterDuration.value = cr.s6waterDuration
        s6waterInterval.value = cr.s6waterInterval

        if (cr.loggingOn) {
            loggingSwitch.checked = true;
        } else {
            loggingSwitch.checked = false;
        }
        if (cr.selfieOn) {
            imagesSwitch.checked = true;
        } else {
            imagesSwitch.checked = false;
        }
        if (cr.commandRequestOn) {
            commandRequestSwitch.checked = true;
        } else {
            commandRequestSwitch.checked = false;
        }
    }
}

function _renderGenvMetricPoint(gmp) {
    if (gmp != null) {
        currTemperature.value = gmp.currTemperature
        waterInterval.value = gmp.waterInterval
        waterDuration.value = gmp.waterDuration

        lastUpdateTs.value = gmp.pointDateTime

        lastWaterTs.value = gmp.lastWaterTs
        lastWaterSecs.value = gmp.lastWaterSecs
    }
}

//------------------------------------------------------------------------------------------------------------
// Query the database for menu and file information and store in js variables
//------------------------------------------------------------------------------------------------------------
export async function queryGenvMetrics(paramData) {
    //console.log("metricsStartDate.value = "+metricsStartDate.value)
    let dateStr = metricsStartDate.value
    let pointDateStartBucket = getDateInt(metricsStartDate.value)
    let startDayTime = parseInt(dateStr.substring(2,4) + startHour.value.padStart(2,'0') + "0000")
    let endDayTime = parseInt(dateStr.substring(2,4) + stopHour.value.padStart(2,'0') + "0000")
    let pointMaxRows = 5000

    /*
    let gql2 = `query {
        joints(
            filter: { 
                and: [ 
                    { PointDay: { eq: ${pointDateStartBucket} } }
                    { PointDayTime: { gte: ${startDayTime} } } 
                    { PointDayTime: { lt: ${endDayTime} } } 
                ] 
            },
            orderBy: { PointDateTime: ASC },
            first: ${pointMaxRows}
          ) {
              items {
                PointDateTime
                currTemperature
              }
          }
    }`

    //console.log("gql2 = "+gql2)

    const apiQuery2 = {
        query: gql2,
        variables: {
        }
    }

    
    showLoadingSpinner(getMetricsButton)
    const endpoint2 = "/data-api/graphql";
    const response = await fetch(endpoint2, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiQuery2)
    })


    const result = await response.json()
    getMetricsButton.innerHTML = getMetricsButtonHTML
    if (result.errors != null) {
        console.log("Error: "+result.errors[0].message);
        console.table(result.errors);
    } else {
        //console.log("result.data # of joints = "+result.data.joints.items.length)

        let numOfDataPoints = result.data.joints.items.length
        let avgGrandTotal = 0.0
        let average = 0.0
        let pointLocalDateTime = null
        let PointDateTime = ""

        let pointData = []
        if (numOfDataPoints > 0) {
            let cnt = 0
            //let numPointsForAvg = 50.0
            let numPointsForAvg = numOfDataPoints / 20
            //console.log(">>> numPointsForAvg = "+numPointsForAvg)

            result.data.joints.items.forEach((point) => {
                avgGrandTotal += point.currTemperature
            })
            average = avgGrandTotal / numOfDataPoints
            //console.log("$$$$$ average = "+average)

            let avgCnt = 0
            let avgTotal = result.data.joints.items[0].currTemperature
            let avgValue = result.data.joints.items[0].currTemperature  // Start it out at the 1st value
            result.data.joints.items.forEach((point) => {
                cnt++
                pointLocalDateTime = convertUTCDateToLocalDate(new Date(point.PointDateTime));
                PointDateTime = pointLocalDateTime.toISOString()

                pointData.push({ 
                    time: PointDateTime.substring(11,16), 
                    currTemp: parseFloat(point.currTemperature),
                    avgTemp: average })
                    //avgTemp: parseFloat(avgValue) })
            })
        }

        if (pointData.length > 0) {
            displayCharts(pointData)
        }
    }
    */
}


function displayCharts(pointData) {
    // create the 2nd dataset by taking the average of X number of data points (like every 10 or 100?)

    if (dailyTempChart == null) {
        //console.log(">>> create dailyTempChart")

        //dailyTempCanvas.style.height = "200%"

        dailyTempChart = new Chart(dailyTempCanvas, {
            type: 'line',
            data: {
              labels: pointData.map(row => row.time),
              datasets: [
                {
                    label: 'Average Tempature',
                    data: pointData.map(row => row.avgTemp),
                    pointRadius: 0,
                    borderWidth: 1,
                    borderColor: 'red',
                },
                {
                    label: 'Tempature over time',
                    data: pointData.map(row => row.currTemp),
                    pointRadius: 0,
                    borderWidth: 1,
                    borderColor: 'rgb(218,165,32)',
                    backgroundColor: 'gold',
                    fill: true
                }
            ]
            },
            options: {
              scales: {
                y: {
                  beginAtZero: false
                }
              }
            }
          })
    } else {
        //console.log(">>> UPDATE dailyTempChart")
        dailyTempChart.data.labels = pointData.map(row => row.time)
        dailyTempChart.data.datasets[0].data = pointData.map(row => row.avgTemp)
        dailyTempChart.data.datasets[1].data = pointData.map(row => row.currTemp)
        dailyTempChart.update()
    }
    
}

