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
import {isAdmin,mediaInfo,getFilePath,getFileName,updateMediaInfo} from './mg-data-repository.js'
import {setPeopleListenersDetail} from './mg-people.js'
import {getAlbumList} from './mg-album.js'

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
var albumOptions
var peopleOptions
var listenClass = ""
//var editMode = true

var beingHeldDown = false
var holdDownStartMs = 0
var holdDownDuration = 900

document.addEventListener('DOMContentLoaded', () => {
    mediaModal = new bootstrap.Modal(document.getElementById('MediaModal'))
    mediaModalTitle = document.getElementById("MediaModalTitle")
    mediaModalBody = document.getElementById("MediaModalBody")

    updImg = document.getElementById("updImg")
    updTitle = document.getElementById("updTitle")
    updTakenDateTime = document.getElementById("updTakenDateTime")
    updCategoryTags = document.getElementById("updCategoryTags")
    updMenuTags = document.getElementById("updMenuTags")
    updAlbumTags = document.getElementById("updAlbumTags")
    updPeople = document.getElementById("updPeople")
    updDescription = document.getElementById("updDescription")
    updMessageDisplay = document.getElementById("updMessageDisplay")

    albumOptions = document.getElementById("albumOptions")
    peopleOptions = document.getElementById("peopleOptions")

    // Handle album option clicks -- append selected album to updAlbumTags (comma-separated, no duplicates)
    albumOptions.addEventListener('click', (event) => {
        if (event.target.classList.contains('dropdown-item')) {
            event.preventDefault()
            
            let albumOptionVal = event.target.textContent.trim()
            let firstSpaceIndex = albumOptionVal.indexOf(" ");   // find the position of the first space
            const selected = albumOptionVal.substring(0, firstSpaceIndex)

            const current = (updAlbumTags.value || '').trim()
            if (selected.length === 0) return
            // Build array of existing tags (trim each)
            const parts = current.length ? current.split(/\s*,\s*/).filter(p => p.length) : []
            // Only append if not already present
            if (!parts.includes(selected)) {
                parts.push(selected)
                updAlbumTags.value = parts.join(', ')
            }
        }
    })

    // Handle people option clicks -- append selected person to updPeople (comma-separated, no duplicates)
    peopleOptions.addEventListener('click', (event) => {
        if (event.target.classList.contains('dropdown-item')) {
            event.preventDefault()
            
            let selected = event.target.textContent.trim()
            //let firstSpaceIndex = albumOptionVal.indexOf(" ");   // find the position of the first space
            //const selected = albumOptionVal.substring(0, firstSpaceIndex)

            const current = (updPeople.value || '').trim()
            if (selected.length === 0) return
            // Build array of existing tags (trim each)
            const parts = current.length ? current.split(/\s*,\s*/).filter(p => p.length) : []
            // Only append if not already present
            if (!parts.includes(selected)) {
                parts.push(selected)
                updPeople.value = parts.join(',')
            }
        }
    })

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
        updMessageDisplay.textContent = ""
        if (!formValid) {
            updMessageDisplay.textContent = "Form inputs are NOT valid"
        } else {
            updateOwner()
        }
        UpdateMediaForm.classList.add('was-validated')
    })
})

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
    if (!isAdmin) {
        //console.log("Context Menu: Not Admin, ignoring request")
        return
    }
    let index = parseInt(event.target.getAttribute('data-index'))
    if (typeof index == "undefined" || index == null) {
        console.log("Context Menu: No data-index found on target")
        return
    }

    if (albumOptions.innerHTML.trim() == '') {
        albumOptions.innerHTML = ''
        let albumList = getAlbumList()
        // Populate with albums from albumList
        for (let index in albumList) {
            const li = document.createElement('li')
            const a = document.createElement('a')
            a.classList.add('dropdown-item')
            a.href = '#'
            a.textContent = albumList[index].albumKey + " " + albumList[index].albumName
            li.appendChild(a)
            albumOptions.appendChild(li)
        }        

        queryPeopleInfo()
    }

    displayModalDetail(index)
    mediaModal.show()
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
        let peopleList = result

        peopleOptions.innerHTML = ''
        for (let index in peopleList) {
            const li = document.createElement('li')
            const a = document.createElement('a')
            a.classList.add('dropdown-item')
            a.href = '#'
            a.textContent = peopleList[index]
            li.appendChild(a)
            peopleOptions.appendChild(li)
        }        
    }
}

//-------------------------------------------------------------------------------------------------------
// Display file information in Medial Modal popup
//-------------------------------------------------------------------------------------------------------
function displayModalDetail(index) {
    // Get the media info information for the selected index from the cached file list        
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
    // Load people
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

    */
/*
    "id": "1",
    "MediaAlbumId": 1,
    "AlbumKey": "AL1",
    "AlbumName": "EA",
    "AlbumDesc": "Good times
*/

}

