/*==============================================================================
(C) Copyright 2023 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:
--------------------------------------------------------------------------------
Modification History
2023-09-01 JJK  Initial version - moved contextmenu components to this module
2025-11-04 JJK  Updated display elements (dedicated modal is already in index.html)
2025-11-24 JJK  Finished update by adding handling of Prev/Next and Save buttons
================================================================================*/
import {empty} from './util.js';
import {isAdmin,mediaInfo,getFilePath,getFileName,updateMediaInfo,getAlbumList,categoryList,menuFilter,setMenuFilter} from './mg-data-repository.js'

var mediaModal
var mediaModalTitle

var updMediaForm
var updIndex
var updImg
var updTitle
var updTakenDateTime
var updCategoryTags
var updMenuTags
var updAlbumTags
var updPeople
var updPeopleButton
var updDescription
var updMessageDisplay
var categoryOptions
var menuOptions
var albumOptions
var peopleOptions
var listenClass = ""
var updPrevMediaInfo
var updNextMediaInfo

var beingHeldDown = false
var holdDownStartMs = 0
var holdDownDuration = 900

document.addEventListener('DOMContentLoaded', () => {
    mediaModal = new bootstrap.Modal(document.getElementById('MediaModal'))
    mediaModalTitle = document.getElementById("MediaModalTitle")

    updMediaForm = document.getElementById("UpdateMediaForm")
    updIndex = document.getElementById("updIndex")
    updImg = document.getElementById("updImg")
    updTitle = document.getElementById("updTitle")
    updTakenDateTime = document.getElementById("updTakenDateTime")
    updCategoryTags = document.getElementById("updCategoryTags")
    updMenuTags = document.getElementById("updMenuTags")
    updAlbumTags = document.getElementById("updAlbumTags")
    updPeople = document.getElementById("updPeople")
    updPeopleButton = document.getElementById("updPeopleButton")
    updDescription = document.getElementById("updDescription")
    updMessageDisplay = document.getElementById("updMessageDisplay")
    updPrevMediaInfo = document.getElementById("updPrevMediaInfo")
    updNextMediaInfo = document.getElementById("updNextMediaInfo")

    categoryOptions = document.getElementById("categoryOptions")
    menuOptions = document.getElementById("menuOptions")
    albumOptions = document.getElementById("albumOptions")
    peopleOptions = document.getElementById("peopleOptions")

    categoryOptions.addEventListener('click', (event) => {
        if (event.target.classList.contains('dropdown-item')) {
            event.preventDefault()
            updCategoryTags.value = event.target.textContent.trim()
            setMenuFilter(updCategoryTags.value)
            // Clear the menu options and re-load from current menuFilter
            menuOptions.innerHTML = ''
            for (let index in menuFilter) {
                const li = document.createElement('li')
                const a = document.createElement('a')
                a.classList.add('dropdown-item')
                a.href = '#'
                a.textContent = menuFilter[index]
                li.appendChild(a)
                menuOptions.appendChild(li)
            }        
        }
    })

    menuOptions.addEventListener('click', (event) => {
        if (event.target.classList.contains('dropdown-item')) {
            event.preventDefault()
            updMenuTags.value = event.target.textContent.trim()
        }
    })

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
                updAlbumTags.value = parts.join(',')
            }
        }
    })

    // Handle people option clicks -- append selected person to updPeople (comma-separated, no duplicates)
    peopleOptions.addEventListener('click', (event) => {
        if (event.target.classList.contains('dropdown-item')) {
            event.preventDefault()
            let selected = event.target.textContent.trim()
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
        
    updPrevMediaInfo.addEventListener("click", function (event) {
        event.preventDefault()
        event.stopPropagation()
        let index = parseInt(updIndex.value)
        if (index > 0) {
            displayModalDetail(index-1)
        }            
    })

    updNextMediaInfo.addEventListener("click", function (event) {
        event.preventDefault()
        event.stopPropagation()
        let index = parseInt(updIndex.value)
        if (index < mediaInfo.fileList.length-1) {
            displayModalDetail(index+1)
        }            
    })

    updMediaForm.addEventListener('submit', function (event) {
        let formValid = updMediaForm.checkValidity()
        event.preventDefault()
        event.stopPropagation()
        updMessageDisplay.textContent = ""
        if (!formValid) {
            updMessageDisplay.textContent = "Form inputs are NOT valid"
        } else {
            let index = parseInt(updIndex.value)
            if (index >= 0) {
                let fi = mediaInfo.fileList[index]
                fi.title = updTitle.value
                fi.takenDateTime = updTakenDateTime.value
                fi.categoryTags = updCategoryTags.value
                fi.menuTags = updMenuTags.value
                fi.albumTags = updAlbumTags.value
                fi.people = updPeople.value
                fi.description = updDescription.value
                updateMediaInfo(index)
            }
        }
        updMediaForm.classList.add('was-validated')
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

    if (categoryOptions.innerHTML.trim() == '') {
        categoryOptions.innerHTML = ''
        for (let index in categoryList) {
            const li = document.createElement('li')
            const a = document.createElement('a')
            a.classList.add('dropdown-item')
            a.href = '#'
            a.textContent = categoryList[index]
            li.appendChild(a)
            categoryOptions.appendChild(li)
        }        
    }

    if (menuOptions.innerHTML.trim() == '') {
        menuOptions.innerHTML = ''
        for (let index in menuFilter) {
            const li = document.createElement('li')
            const a = document.createElement('a')
            a.classList.add('dropdown-item')
            a.href = '#'
            a.textContent = menuFilter[index]
            li.appendChild(a)
            menuOptions.appendChild(li)
        }        
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

    updIndex.value = index
    updImg.src = getFilePath(index,"Smaller")
    updTitle.value = fi.title
    updTakenDateTime.value = fi.takenDateTime
    updCategoryTags.value = fi.categoryTags
    updMenuTags.value = fi.menuTags
    updAlbumTags.value = fi.albumTags
    updPeople.value = fi.people
    updDescription.value = fi.description
    updMessageDisplay.value = ""
}

