/*==============================================================================
(C) Copyright 2023 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:
--------------------------------------------------------------------------------
Modification History
2023-09-01 JJK  Initial version - moved contextmenu components to this module
2025-11-04 JJK  Updated display elements (dedicated modal is already in index.html)
================================================================================*/
import {empty} from './util.js';
import {mediaInfo,getFilePath,getFileName,updateMediaInfo} from './mg-data-repository.js'
import {setPeopleListenersDetail} from './mg-people.js'
import {albumList} from './mg-album.js'

var mediaModal
var mediaModalTitle
var mediaModalBody

var updImg
var updTitle
var updTakenDateTime
var updCategoryTags
var updMenuTags
var updAlbumTags
var updPeople
var updDescription
var updMessageDisplay
var listenClass = ""
var editMode = true

var beingHeldDown = false
var holdDownStartMs = 0
var holdDownDuration = 900

document.addEventListener('DOMContentLoaded', () => {
    mediaModal = new bootstrap.Modal(document.getElementById('MediaModal'))
    mediaModalTitle = document.getElementById("MediaModalTitle")
    mediaModalBody = document.getElementById("MediaModalBody")

    updImg = document.getElementById("updImg")
    //updImg = document.getElementById("updImg")
    updTitle = document.getElementById("updTitle")
    updTakenDateTime = document.getElementById("updTakenDateTime")
    updCategoryTags = document.getElementById("updCategoryTags")
    updMenuTags = document.getElementById("updMenuTags")
    updAlbumTags = document.getElementById("updAlbumTags")
    updPeople = document.getElementById("updPeople")
    updDescription = document.getElementById("updDescription")
    updMessageDisplay = document.getElementById("updMessageDisplay")

    document.addEventListener('touchstart', (event) => {
        holdDownStart(event)
    })
    document.addEventListener('touchend', (event) => {
        holdDownEnd(event)
    })   
    document.addEventListener('touchcancel', (event) => {
        holdDownEnd(event)
    })   
    document.addEventListener('mousedown', (event) => {
        if (event.button == 0) {
            holdDownStart(event)
        }
    })
    document.addEventListener('mouseup', (event) => {
        if (event.button == 0) {
            holdDownEnd(event)
        }
    })

    UpdateMediaForm.addEventListener('submit', (event) => {
        let formValid = UpdateMediaForm.checkValidity()
        event.preventDefault()
        event.stopPropagation()
        UpdateOwnerMessageDisplay.textContent = ""
        if (!formValid) {
            UpdateOwnerMessageDisplay.textContent = "Form inputs are NOT valid"
        } else {
            updateOwner()
        }
        UpdateMediaForm.classList.add('was-validated')
    })

})

  function setValue(val) {
    document.getElementById("myInput").value = val;
  }


export function formatUpdateOwner(parcelId,ownerId,saleDate="") {
    if (hoaRec.property.parcel_ID != parcelId) {
        console.error("Parcel ID not found in current hoaRec, id = "+parcelId)
         messageDisplay.textContent = `Parcel ID not found in current hoaRec, id = ${parcelId}`
        return        
    }

    let ownerRec = null
    let salesRec = null

    if (ownerId == "NEW") {
        // Get the current owner rec
        for (let index in hoaRec.ownersList) {
            if (hoaRec.ownersList[index].currentOwner == 1) {
                ownerRec = hoaRec.ownersList[index]
            }
        }

        // get the Sales record for this parcel (if new and saledt passed)
        if (saleDate != "") {
            for (let index in hoaRec.salesList) {
                //if (hoaRec.property.parcel_ID == parcelId && hoaRec.salesList[index].saleDate == saleDate) {
                if (hoaRec.property.parcel_ID == parcelId && hoaRec.salesList[index].saledt == saleDate) {
                    salesRec = hoaRec.salesList[index]
                }
            }
        }
    } else {
        // Find the correct owner rec
        for (let index in hoaRec.ownersList) {
            if (hoaRec.property.parcel_ID == parcelId && hoaRec.ownersList[index].ownerID == ownerId) {
                ownerRec = hoaRec.ownersList[index]
            }
        }
    }
    if (ownerRec == null) {
        console.error("Owner ID not found in current hoaRec, id = "+ownerId)
        messageDisplay.textContent = `Owner ID not found in current hoaRec, id = ${ownerId}`
        return        
    }

    updParcel_ID.value = hoaRec.property.parcel_ID
    updParcelLocation.textContent = hoaRec.property.parcel_Location
    updOwnerID.value = ownerRec.id
    updCurrentOwner.checked = ownerRec.currentOwner
    updOwner_Name1.value = ownerRec.owner_Name1
    updOwner_Name2.value = ownerRec.owner_Name2
    updDatePurchased.value = standardizeDate(ownerRec.datePurchased)
    updMailing_Name.value = ownerRec.mailing_Name
    updAlternateMailing.checked = ownerRec.alternateMailing
    updAlt_Address_Line1.value = ownerRec.alt_Address_Line1
    updAlt_Address_Line2.value = ownerRec.alt_Address_Line2
    updAlt_City.value = ownerRec.alt_City
    updAlt_State.value = ownerRec.alt_State
    updAlt_Zip.value = ownerRec.alt_Zip
    updOwner_Phone.value = ownerRec.owner_Phone
    updEmailAddr.value = ownerRec.emailAddr
    updEmailAddr2.value = ownerRec.emailAddr2
    updComments.value = ownerRec.comments
    updLastChangedTs.value = ownerRec.lastChangedTs
    updLastChangedBy.value = ownerRec.lastChangedBy

    // If creating a NEW owner, override values from the sale rec
    if (ownerId == "NEW") {
        updOwnerID.value = createNewOwnerIdStr
        if (salesRec != null) {
            updOwner_Name1.value = salesRec.ownernamE1
            updOwner_Name2.value = ""
            updDatePurchased.value = standardizeDate(salesRec.saledt)
            // 2025-09-17 JJK - Problem is the values in Sales record from the County are inconsistent
            //   sometimes the mailing name is the new owner, but sometimes it is the old owner
            //   *** So, just use the Owner Name field for now ***
            //updMailing_Name.value = salesRec.mailingnamE1 + " " + salesRec.mailingnamE2
            updMailing_Name.value = salesRec.ownernamE1

            // Clear out values for NEW owner
            updAlternateMailing.checked = 0;
            updAlt_Address_Line1.value = ""
            updAlt_Address_Line2.value = ""
            updAlt_City.value = ""
            updAlt_State.value = ""
            updAlt_Zip.value = ""
            updOwner_Phone.value = ""
            updEmailAddr.value = ""
            updEmailAddr2.value = ""
            updComments.value = ""
            updLastChangedTs.value = ""
            updLastChangedBy.value = ""
        }
    }

    OwnerUpdateModal.show()
}

// Handle the file upload backend server call
async function updateOwner() {
    UpdateOwnerMessageDisplay.textContent = "Updating Owner..."

    let newOwner = false
    if (updOwnerID.value == createNewOwnerIdStr) {
        newOwner = true
    }

    try {
        const response = await fetch("/api/UpdateOwner", {
            method: "POST",
            body: new FormData(UpdateMediaForm)
        })
        await checkFetchResponse(response)
        // Success
        let ownerRec = await response.json();
        OwnerUpdateModal.hide()
        if (newOwner) {
            await getHoaRec(ownerRec.parcel_ID)
            messageDisplay.textContent = "New Owner created sucessfully"
        } else {
            // Replace the record in the owners list
            let ownerFound = false
            for (let index in hoaRec.ownersList) {
                if (hoaRec.property.parcel_ID == ownerRec.parcel_ID && hoaRec.ownersList[index].ownerID == ownerRec.ownerID) {
                    ownerFound = true
                    hoaRec.ownersList[index] = ownerRec
                }
            }
            if (!ownerFound) {
                console.error("Owner ID not found in current hoaRec, id = "+ownerRec.ownerId)
                messageDisplay.textContent = "Owner ID not found in current hoaRec, id = "+ownerRec.ownerId
                return        
            }
            // Display the updated owner record
            messageDisplay.textContent = "Owner updated sucessfully"
            displayDetailOwners()
        }
    } catch (err) {
        console.error(err)
        UpdateOwnerMessageDisplay.textContent = `Error in Fetch: ${err.message}`
    }
}


export function updateMessage(displayMessage) {
    if (updMessageDisplay != null) {
        updMessageDisplay.textContent = displayMessage
    }
}

export function setContextMenuListeners(listenContainer, inClass) {
    listenClass = inClass
    //-------------------------------------------------------------------------------------------------------------------
    // Listen for context menu requests in the container
    //-------------------------------------------------------------------------------------------------------------------
    listenContainer.addEventListener('contextmenu', (event) => {
        event.preventDefault()
        displayImgContextMenu(event)
    })
}

function displayImgContextMenu(event) {
    let index = parseInt(event.target.getAttribute('data-index'))
    if (typeof index !== "undefined" && index !== null) {
        displayModalDetail(index)
        mediaModal.show()
    }
}

    function holdDownStart(event) {
        //console.log("HOLD DOWN $$$ Start")
        if (!beingHeldDown) {
            beingHeldDown = true
            //Date.now() Return value A number representing the timestamp, in milliseconds
            holdDownStartMs = Date.now()
            // Kick off timeout to check at the end of duration
            //console.log("   $$$ NOT being Held,    holdDownStartMs = "+holdDownStartMs)
            setTimeout(function(){ holdDownCheck(event) }, holdDownDuration)
        }
    }
    function holdDownEnd(event) {
        //console.log("HOLD DOWN >>>>> End")
        beingHeldDown = false
    }
    function holdDownCheck(event) {
        //console.log("HOLD DOWN *** Check ***")
        // Check at the end of the duration timeout if it is still being held down
        if (beingHeldDown) {
            // double check how long it's actually been holding
            let holdDuration = Date.now() - holdDownStartMs
            //console.log("   *** Being Held, tempDuration = "+tempDuration)
            //if ((Date.now() - holdDownStartMs) >= holdDownDuration) {
            if ((holdDuration) >= holdDownDuration) {
                if (event.target.classList.contains(listenClass)) {
                    event.preventDefault()
                    displayImgContextMenu(event)
                } 
            }
        }
    }

//-------------------------------------------------------------------------------------------------------
// Display file information in Medial Modal popup
//-------------------------------------------------------------------------------------------------------
function displayModalDetail(index) {
    // Get the media info information for the selected index from the file list        
    let fi = mediaInfo.fileList[index]

    // >>> work out "Share" concepts - what do I need to store in the DB?
    // (if using this as the general context menu - like for the Public display - get an option in the
    //  context menu for "sharing" a link so someone can click and come to the website and see the photo)

    mediaModalTitle.textContent = fi.name;

    updImg.src = getFilePath(index,"Smaller")
    updImg.dataset.index = index
    //updImg.setAttribute('data-index', index)
    updTitle.value = fi.title
    updTakenDateTime.value = fi.takenDateTime
    updCategoryTags.value = fi.categoryTags
    updMenuTags.value = fi.menuTags
    updAlbumTags.value = fi.albumTags
    updPeople.value = fi.people
    updDescription.value = fi.description
    updMessageDisplay.value = ""


/*
    empty(mediaModalBody)
    
    let topRow = document.createElement("div");
    topRow.classList.add('row')

    let col1 = document.createElement("div");
    col1.classList.add('col-sm-4')
    let img = document.createElement("img");
    img.setAttribute('onerror', "this.onerror=null; this.remove()")
    img.classList.add('img-fluid','rounded')
    img.src = getFilePath(index,"Smaller")
    img.setAttribute('data-index', index)
    col1.appendChild(img)


    let itemList = document.createElement("ul")
    itemList.classList.add("list-group","mt-3")
    let a = document.createElement("a")
    a.setAttribute('href', getFilePath(index,"",true))
    a.classList.add("list-group-item","list-group-item-action")
    a.target = '_blank'
    a.textContent = "Open FULL image in new tab"
    itemList.appendChild(a)

    a = document.createElement("a")
    a.setAttribute('href', getFilePath(index,"",true))
    a.download = getFileName(index)
    a.classList.add("list-group-item","list-group-item-action")
    a.textContent = "Save (Download) FULL image"
    itemList.appendChild(a)

    col1.appendChild(itemList)

    //----------------------------------------------------------------------------------
    // File detail fields in Col 2
    //----------------------------------------------------------------------------------
    let col2 = document.createElement("div");
    col2.classList.add('col-sm')

    let row = document.createElement("div");
    row.classList.add('row')
    let rowCol1 = document.createElement("div");
    rowCol1.classList.add('col-sm-2')
    rowCol1.textContent = "Title"
    let rowCol2 = document.createElement("div");
    rowCol2.classList.add('col-sm')

    // Title
    mediaDetailTitle = document.createElement("input")
    mediaDetailTitle.classList.add('form-control','py-1','mb-1','shadow-none')
    mediaDetailTitle.setAttribute('type', "text")
    //mediaDetailTitle.setAttribute('placeholder', "Title")
    if (editMode) {
        mediaDetailTitle.disabled = false
    } else {
        mediaDetailTitle.disabled = true
    }
    mediaDetailTitle.value = fi.title
        
    rowCol2.appendChild(mediaDetailTitle)
    row.appendChild(rowCol1)
    row.appendChild(rowCol2)
    col2.appendChild(row)

    row = document.createElement("div");
    row.classList.add('row')
    rowCol1 = document.createElement("div");
    rowCol1.classList.add('col-sm-2')
    rowCol1.textContent = "Taken"
    rowCol2 = document.createElement("div");
    rowCol2.classList.add('col-sm')
        
    // Taken
    mediaDetailTaken = document.createElement("input")
    mediaDetailTaken.classList.add('form-control','py-1','mb-1','shadow-none')
    mediaDetailTaken.setAttribute('type', "text")
    //mediaDetailTaken.setAttribute('placeholder', "Taken DateTime")
    if (editMode) {
        mediaDetailTaken.disabled = false
    } else {
        mediaDetailTaken.disabled = true
    }
    mediaDetailTaken.value = fi.takenDateTime
    rowCol2.appendChild(mediaDetailTaken)
    row.appendChild(rowCol1)
    row.appendChild(rowCol2)
    col2.appendChild(row)

    row = document.createElement("div");
    row.classList.add('row')
    rowCol1 = document.createElement("div");
    rowCol1.classList.add('col-sm-2')
    rowCol1.textContent = "Category tags"
    rowCol2 = document.createElement("div");
    rowCol2.classList.add('col-sm')
    // Category Tags
    mediaDetailCategoryTags = document.createElement("input")
    //mediaDetailCategoryTags.id = "MediaDetailCategoryTags"
    mediaDetailCategoryTags.classList.add('form-control','py-1','mb-1','shadow-none')
    mediaDetailCategoryTags.setAttribute('type', "text")
    //mediaDetailCategoryTags.setAttribute('placeholder', "Category tags")
    if (editMode) {
        mediaDetailCategoryTags.disabled = false
    } else {
        mediaDetailCategoryTags.disabled = true
    }
    mediaDetailCategoryTags.value = fi.categoryTags
    rowCol2.appendChild(mediaDetailCategoryTags)
    row.appendChild(rowCol1)
    row.appendChild(rowCol2)
    col2.appendChild(row)

    row = document.createElement("div");
    row.classList.add('row')
    rowCol1 = document.createElement("div");
    rowCol1.classList.add('col-sm-2')
    rowCol1.textContent = "Menu tags"
    rowCol2 = document.createElement("div");
    rowCol2.classList.add('col-sm')
    // Menu Tags
    mediaDetailMenuTags = document.createElement("input")
    //mediaDetailMenuTags.id = "MediaDetailMenuTags"
    mediaDetailMenuTags.classList.add('form-control','py-1','mb-1','shadow-none')
    mediaDetailMenuTags.setAttribute('type', "text")
    mediaDetailMenuTags.setAttribute('placeholder', "Menu tags")
    if (editMode) {
        mediaDetailMenuTags.disabled = false
    } else {
        mediaDetailMenuTags.disabled = true
    }
    mediaDetailMenuTags.value = fi.menuTags
    rowCol2.appendChild(mediaDetailMenuTags)
    row.appendChild(rowCol1)
    row.appendChild(rowCol2)
    col2.appendChild(row)


    row = document.createElement("div");
    row.classList.add('row')
    rowCol1 = document.createElement("div");
    rowCol1.classList.add('col-sm-2')
    rowCol1.textContent = "Album tags"
    rowCol2 = document.createElement("div");
    rowCol2.classList.add('col-sm')
    // Album Tags
    mediaDetailAlbumTags = document.createElement("input")
    //mediaDetailAlbumTags.id = "MediaDetailAlbumTags"
    mediaDetailAlbumTags.classList.add('form-control','py-1','mb-1','shadow-none')
    mediaDetailAlbumTags.setAttribute('type', "text")
    //mediaDetailAlbumTags.setAttribute('placeholder', "Album tags")
    if (editMode) {
        mediaDetailAlbumTags.disabled = false
    } else {
        mediaDetailAlbumTags.disabled = true
    }
    mediaDetailAlbumTags.value = fi.albumTags
    rowCol2.appendChild(mediaDetailAlbumTags)


    var mediaAlbumSelect = document.createElement("select")
    //mediaAlbumSelect.classList.add('form-select','float-start','shadow-none','mt-2','py-1')
    mediaAlbumSelect.classList.add('form-select','float-start','shadow-none')
    for (let index in albumList) {
        if (index == 1) {
            mediaAlbumSelect.options[mediaAlbumSelect.options.length] = new Option(albumList[index].albumKey+" "+albumList[index].albumName, albumList[index].albumKey, true, true)
        } else {
            mediaAlbumSelect.options[mediaAlbumSelect.options.length] = new Option(albumList[index].albumKey+" "+albumList[index].albumName, albumList[index].albumKey)
        }
    }
    // When the Category changes, set the menuFilter menu items for that Category
    mediaAlbumSelect.addEventListener("change", function () {
        // set menuFilter array based on selected CategoryName
        setMenuFilter(mediaAlbumSelect.value)
        // Clear the menu options and re-load from current menuFilter
        mediaMenuSelect.options.length = 0
        for (let index in menuFilter) {
            mediaMenuSelect.options[mediaMenuSelect.options.length] = new Option(menuFilter[index], menuFilter[index])
        }
        mediaDetailAlbumTags.value = mediaAlbumSelect.value
    })
    //editRow1Col3.appendChild(mediaAlbumSelect);
    
    // >>>>> Create a drop-down for Album Tags based on the albumList from mg-album
    for (let index in albumList) {
        //console.log(">>> albumList["+index+"].albumKey = "+albumList[index].albumKey+", name = "+albumList[index].albumName)
    }
    rowCol2.appendChild(mediaAlbumSelect)


    row.appendChild(rowCol1)
    row.appendChild(rowCol2)
    col2.appendChild(row)

    row = document.createElement("div");
    row.classList.add('row')
    rowCol1 = document.createElement("div");
    rowCol1.classList.add('col-sm-2')
    rowCol1.textContent = "People"
    rowCol2 = document.createElement("div");
    rowCol2.classList.add('col-sm')

    //-------------------------------------------------------------------------------------------------------------
    // *** People list ***
    //-------------------------------------------------------------------------------------------------------------
    mediaPeopleList = document.createElement("input")
    mediaPeopleList.classList.add('form-control','shadow-none','py-1')
    mediaPeopleList.setAttribute('type',"text")
    mediaPeopleList.setAttribute('placeholder',"People list")
    mediaPeopleList.value = fi.people
    let peopleButton = document.createElement("button")
    peopleButton.classList.add('btn','btn-danger','btn-sm','float-start','shadow-none','me-2','my-1')
    peopleButton.setAttribute('type',"button")
    peopleButton.setAttribute('role',"button")
    peopleButton.textContent = "People"

    rowCol2.appendChild(peopleButton)
    setPeopleListenersDetail(peopleButton,mediaPeopleList)
    rowCol2.appendChild(mediaPeopleList);

    row.appendChild(rowCol1)
    row.appendChild(rowCol2)
    col2.appendChild(row)

    row = document.createElement("div");
    row.classList.add('row')
    rowCol1 = document.createElement("div");
    rowCol1.classList.add('col-sm-2')
    rowCol1.textContent = "Description"
    // Add a SAVE button under the Description label
    if (editMode) {
        let editSaveButton = document.createElement("button")
        editSaveButton.classList.add('btn','btn-success','btn-sm','float-start','shadow-none','mt-3','me-2','mb-3')
        editSaveButton.setAttribute('type',"button")
        editSaveButton.setAttribute('role',"button")
        editSaveButton.textContent = "Update"
        rowCol1.appendChild(editSaveButton)
        editSaveButton.addEventListener("click", function () {
                fi.title = mediaDetailTitle.value
                fi.takenDateTime = mediaDetailTaken.value
                fi.categoryTags = mediaDetailCategoryTags.value
                fi.menuTags = mediaDetailMenuTags.value
                fi.albumTags = mediaDetailAlbumTags.value
                fi.people = mediaPeopleList.value
                fi.description = mediaDetailDescription.value
                updateMediaInfo(index)
                //mediaModal.hide()
        })
    }
    
    // Prev
    let detailPrevButton = document.createElement("button")
            //detailPrevButton.id = "MediaAdminSelectAllButton"
            detailPrevButton.classList.add('btn','btn-warning','btn-sm','float-start','shadow-none','me-2','my-0')
            detailPrevButton.setAttribute('type',"button")
            detailPrevButton.setAttribute('role',"button")
            detailPrevButton.textContent = "Prev"
            rowCol1.appendChild(detailPrevButton)
            detailPrevButton.addEventListener("click", function () {
                if (index > 0) {
                    displayModalDetail(index-1)
                }            
            })
    // Next
    let detailNextButton = document.createElement("button")
            //detailNextButton.id = "MediaAdminGetNewButton"
            detailNextButton.classList.add('btn','btn-info','btn-sm','float-start','shadow-none','me-2','my-1')
            detailNextButton.setAttribute('type',"button")
            detailNextButton.setAttribute('role',"button")
            detailNextButton.textContent = "Next"
            rowCol1.appendChild(detailNextButton)
            detailNextButton.addEventListener("click", function () {
                if (index < mediaInfo.fileList.length-1) {
                    displayModalDetail(index+1)
                }            
            });
        
    rowCol2 = document.createElement("div");
    rowCol2.classList.add('col-sm')
            // Description
            mediaDetailDescription = document.createElement("textarea")
            //mediaDetailDescription.id = "MediaDetailDescription"
            mediaDetailDescription.classList.add('form-control','py-1','my-1','shadow-none')
            mediaDetailDescription.setAttribute('rows', "6")
            mediaDetailDescription.setAttribute('placeholder', "Description")
            if (editMode) {
                mediaDetailDescription.disabled = false
            } else {
                mediaDetailDescription.disabled = true
            }
            mediaDetailDescription.value = fi.description
    rowCol2.appendChild(mediaDetailDescription)
    row.appendChild(rowCol1)
    row.appendChild(rowCol2)
    col2.appendChild(row)

    if (editMode) {
            row = document.createElement("div");
            row.classList.add('row')
            rowCol1 = document.createElement("div");
            rowCol1.classList.add('col-sm-2')
            //rowCol1.textContent = ""
            rowCol2 = document.createElement("div");
            rowCol2.classList.add('col-sm')
            updateMessageDisplay = document.createElement("div")
            updateMessageDisplay.textContent = "."
            rowCol2.appendChild(updateMessageDisplay)
            row.appendChild(rowCol1)
            row.appendChild(rowCol2)
            col2.appendChild(row)
    }

    topRow.appendChild(col1)
    topRow.appendChild(col2)
    mediaModalBody.appendChild(topRow)
    */
/*
    "id": "1",
    "MediaAlbumId": 1,
    "AlbumKey": "AL1",
    "AlbumName": "EA",
    "AlbumDesc": "Good times
*/


}

