/*==============================================================================
(C) Copyright 2024 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:
--------------------------------------------------------------------------------
Modification History
2024-08-09 JJK  Initial version - pop-up for People lookup
================================================================================*/

const peopleModal = new bootstrap.Modal(document.getElementById('PeopleModal'))

var PeopleInput = document.getElementById("PeopleInput")
var PeopleSelect = document.getElementById("PeopleSelect")
var PeopleReplaceButton = document.getElementById("PeopleReplaceButton")
var PeopleAppendButton = document.getElementById("PeopleAppendButton")
var PeopleInputList = document.getElementById("PeopleInputList")
var PeopleSaveButton = document.getElementById("PeopleSaveButton")

var peopleList = []
var peopleSaveList
var peopleSaveListDetail

export function setPeopleListeners(peopleButton, inPeopleList) {
    peopleSaveList = inPeopleList
    peopleButton.addEventListener("click", function () {
        PeopleInputList.value = peopleSaveList.value
        if (peopleList.length == 0) {
            queryPeopleInfo()
        } else {
            peopleModal.show()
        }
    })
}

export function setPeopleListenersDetail(peopleButton, inPeopleList) {
    peopleSaveListDetail = inPeopleList
    peopleButton.addEventListener("click", function () {
        PeopleInputList.value = peopleSaveListDetail.value
        if (peopleList.length == 0) {
            queryPeopleInfo()
        } else {
            peopleModal.show()
        }
    })
}

//------------------------------------------------------------------------------------------------------------
// Query the database for people data and store in js variables
//------------------------------------------------------------------------------------------------------------
async function queryPeopleInfo() {
    const endpoint = "/api/GetPeopleList";
    const response = await fetch(endpoint, {
        method: "POST"
    })
    const result = await response.json()
    if (result.errors != null) {
        console.log("Error: "+result.errors[0].message)
        console.table(result.errors)
        // Message display ???
    } else {
        peopleList = result
        for (let index in peopleList) {
            PeopleSelect.options[PeopleSelect.options.length] = new Option(peopleList[index], index)
        }
        peopleModal.show()
    }

}

// https://www.w3schools.com/howto/tryit.asp?filename=tryhow_css_js_dropdown_filter

PeopleInput.addEventListener("keyup", function(event) {
    let peopleInputVal = ""
    if (PeopleInput.value != null) {
        peopleInputVal = PeopleInput.value.toUpperCase()
    }

    // Remove all options
    for (let i = (PeopleSelect.options.length-1); i > -1; i--) {
        PeopleSelect.options.remove(i)
    }

    // Add the ones that match the input value
    for (let index in peopleList) {
        if (peopleInputVal != "") {
            if (peopleList[index].toUpperCase().indexOf(peopleInputVal) > -1) {
                PeopleSelect.options[PeopleSelect.options.length] = new Option(peopleList[index], index)
            }
        } else {
            PeopleSelect.options[PeopleSelect.options.length] = new Option(peopleList[index], index)
        }
    }
})

PeopleReplaceButton.addEventListener("click", function () {
    PeopleInputList.value = peopleList[PeopleSelect.value]
})

PeopleAppendButton.addEventListener("click", function () {
    if (PeopleInputList.value) {
        PeopleInputList.value = PeopleInputList.value + ',' + peopleList[PeopleSelect.value]
    } else {
        PeopleInputList = peopleList[PeopleSelect.value]
    }
})

PeopleSaveButton.addEventListener("click", function () {
    peopleSaveList.value = PeopleInputList.value
    peopleSaveListDetail.value = PeopleInputList.value
    peopleModal.hide()
})

