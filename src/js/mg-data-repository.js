/*==============================================================================
(C) Copyright 2023,2024,2026 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Main module to handle interactions with database and file system
                as well as keeping mediaInfo and menu data structures
--------------------------------------------------------------------------------
Modification History
2023-08-06 JJK  Initial version - moved MediaInfo components to this module
2023-09-08 JJK  Renamed to DataRepository to show its function
2023-09-30 JJK  Adjusted location parameters for albumKey handling
--------------------------------------------------------------------------------
2024-03-29 JJK  Migrating to Azure SWA, blob storage, Cosmos DB with GraphQL
                for queries.  Also, removing Admin functions to make this just
                the presentation functions with no edit
2024-04-04 JJK  Finally got a good structure for MediaInfo container in
                Cosmos DB and got all of the records copied.  Now able to
                do GraphQL queries with "gte" on TakenFileTime integer,
                contains on strings, orderBy on Taken, and first maxRows
2024-06-20 JJK  Getting an error from Azure on the MediaType query, so I've
                hard-coded the categories and menu items for now
2024-12-02 JJK  Added util module and spinner for loading... mediaPageMessage
2025-10-24 JJK  Refactored to use new function API endpoint instead of data-api
2025-10-30 JJK  Adjusting logic for media queries 
2025-11-01 JJK  Re-adding admin update functions
2025-11-15 JJK  Moving filter elements here from mg-create-pages.js
2025-11-24 JJK  Got context menu update working again
2025-11-28 JJK  Re-adding multi-record update, and cleaning up query filter logic:
                Menu, Album, and Filter elements are created in index.html
                Filter:  Sets Catregory, Start Date, Search String 
                Menu: Set Category and Menu Item (clears AlbumKey, Start Date, Search String)
                Album: Sets AlbumKey (Sets Category to ALL), clear all other filters
                (However, the filter buttons use Start Date for Next)
2026-05-02 JJK  Adding function to get timestamp from filename for multi-record updates
================================================================================*/
import {mediaTypeData} from './mg-mediaTypeData.js';
import {empty,showLoadingSpinner,fetchApi,checkFetchResponse,addDaysLocale} from './util.js';
import {createMediaPage,displayCurrFileList,updateAdminMessage} from './mg-create-pages.js';
import {updateMessage} from './mg-contextmenu.js';

export var isAdmin = false

export var mediaInfo = {
    menuList: [],
    filterList: [],
    fileList: [],
    startDate: "",
    menuOrAlbumName: ""}
export var mediaType = 1
export var mediaTypeDesc = "Photos"
export var contentDesc = ""

export var queryCategory = ""
export var queryMenuItem = ""
export var queryAlbumKey = ""
export var querySearchStr = ""

export var categoryList = []
var defaultCategory = ""
export var menuFilter = []

// Look into using environment variables for this (like secrets for Azure credentials)
const photosUri = "https://jjkwebstorage.blob.core.windows.net/photos/"
const thumbsUri = "https://jjkwebstorage.blob.core.windows.net/thumbs/"
const musicUri = "https://jjkwebstorage.blob.core.windows.net/music/"
const docsUri = "https://jjkwebstorage.blob.core.windows.net/docs/"

var MediaPageFilterContainer
var MediaPageMessage
var MediaPageThumbnailContainer
var mediaFilterCategory
var mediaFilterStartDate
var mediaFilterSearchStr
var contentDescEl

// from mg-menu.js
//var menuList = []
var mediaMenuCanvas
var mediaMenuCanvasLabel
const MediaOffcanvasMenuId = "MediaOffcanvasMenu"
const MediaMenuRequestClass = "MediaMenuRequest"
var menuContainer

const MediaAlbumMenuRequestClass = "MediaAlbumMenuRequest"
var albumList = []
var mediaAlbumMenuCanvas
var menuAlbumContainer
var mediaAlbumMenuCanvasLabel

var CheckAdminButton
var CheckAdminMessage

document.addEventListener('DOMContentLoaded', () => {
    CheckAdminButton = document.getElementById("CheckAdminButton")
    CheckAdminMessage = document.getElementById("CheckAdminMessage")
    CheckAdminButton.addEventListener("click", function (event) {
        checkAdmin()
    })

    MediaPageFilterContainer = document.getElementById("MediaPageFilterContainer")
    MediaPageMessage = document.getElementById("MediaPageMessage")
    MediaPageThumbnailContainer = document.getElementById("MediaPageThumbnailContainer")

    mediaFilterCategory = document.getElementById('MediaFilterCategory')
    mediaFilterCategory.onchange = function () { executeFilter() }
    mediaFilterStartDate = document.getElementById('MediaFilterStartDate')
    mediaFilterStartDate.onchange = function () { executeFilter(mediaFilterStartDate.value) }
    mediaFilterSearchStr = document.getElementById('MediaFilterSearchStr')
    mediaFilterSearchStr.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault(``)
            executeFilter()
        }
    })

    contentDescEl = document.getElementById('MediaContentDesc')

    mediaMenuCanvas = bootstrap.Offcanvas.getOrCreateInstance(document.getElementById("MediaMenuCanvas"))
    menuContainer = document.getElementById(MediaOffcanvasMenuId)
    mediaMenuCanvasLabel = document.getElementById("MediaMenuCanvasLabel")
    menuContainer.addEventListener("click", function (event) {
        if (event.target && event.target.classList.contains(MediaMenuRequestClass)) {
            let eventCategory = event.target.getAttribute('data-category')
            // Set the selected category in the dropdown to match the clicked menu item
            if (mediaFilterCategory) {
                for (let i = 0; i < mediaFilterCategory.options.length; i++) {
                    if (mediaFilterCategory.options[i].value === eventCategory) {
                        mediaFilterCategory.options[i].selected = true
                        break
                    }
                }
            }

            let paramData = {
                MediaFilterMediaType: mediaType, 
                getMenu: false,
                MediaFilterCategory:  eventCategory,
                MediaFilterMenuItem:  event.target.getAttribute('data-menuItem'),
                MediaFilterStartDate: "",
                MediaFilterSearchStr: ""
            }

            queryMediaInfo(paramData);
            mediaMenuCanvas.hide();
        }
    })

    mediaAlbumMenuCanvas = bootstrap.Offcanvas.getOrCreateInstance(document.getElementById("MediaAlbumMenuCanvas"))
    mediaAlbumMenuCanvasLabel = document.getElementById("MediaAlbumMenuCanvasLabel")
    menuAlbumContainer = document.getElementById("MediaOffcanvasAlbumMenu")
    menuAlbumContainer.addEventListener("click", function (event) {
        if (event.target && event.target.classList.contains(MediaAlbumMenuRequestClass)) {
            let paramData = {
                MediaFilterMediaType: mediaType, 
                getMenu: false,
                MediaFilterAlbumKey:  event.target.getAttribute('data-albumKey'),
                MediaFilterAlbumName:  event.target.getAttribute('data-albumName'),
                MediaFilterCategory:  "ALL",
                MediaFilterMenuItem:  "",
                MediaFilterStartDate: "",
                MediaFilterSearchStr: ""
            }
    
            queryMediaInfo(paramData);
            mediaAlbumMenuCanvas.hide();
        }
    })
})

async function checkAdmin() {
    CheckAdminMessage.textContent = ""
    try {
        const response = await fetchApi("CheckAdminRole",
        {
            method: "POST",
            requireAuth: true
        })

        await checkFetchResponse(response);
        isAdmin = await response.json()
        if (isAdmin) {
            CheckAdminMessage.textContent = "User is Admin"
        } else {
            CheckAdminMessage.textContent = "User is NOT Admin"
        }

    } catch (err) {
        CheckAdminMessage.textContent = "User is NOT Admin"
    }
}

export function setMediaType(inMediaType) {
    mediaType = parseInt(inMediaType)
}

export function setAlbumList(inAlbumList) {
    albumList = inAlbumList
}
export function getAlbumList() {
    return albumList
}
export function getAlbumName(inAlbumKey) {
    let retAlbumName = ""
    for (let index in albumList) {
        if (albumList[index].albumKey == inAlbumKey) {
            retAlbumName = albumList[index].albumName
        }
    }
    return retAlbumName
}

export function getFilePath(index,descMod="",fullPath=false) {
    // descMod could be "Thumbs" or "Smaller"
    let fi = mediaInfo.fileList[index]

    if (mediaType == 4) {
        return docsUri + fi.name
    } else if (mediaType == 3) {
        return musicUri + fi.name
    } else {
        if (descMod == "Thumbs") {
            return thumbsUri + fi.name
        } else {
            return photosUri + fi.name
        }
    }
}

export function getFileName(index) {
    let fi = mediaInfo.fileList[index]
    let fileNameNoExt = fi.name
    if (mediaType == 3 && fi.title != '') {
        fileNameNoExt = fi.title
    }
    let periodPos = fileNameNoExt.indexOf(".");
    if (periodPos >= 0) {
        fileNameNoExt = fileNameNoExt.substr(0,periodPos);
    }
    return fileNameNoExt
}

//------------------------------------------------------------------------------------------------------------
// Query the database for menu and file information and store in js variables
//------------------------------------------------------------------------------------------------------------
export async function queryMediaInfo(paramData) {
    // This is set when tab, tile, or album is clicked, but making sure it get set in the parameter values (for the API calls)
    if (paramData.MediaFilterMediaType != null && paramData.MediaFilterMediaType != '') {
        setMediaType(parseInt(paramData.MediaFilterMediaType))
    } else {
        paramData.MediaFilterMediaType = mediaType.toString()
    }   

    //console.log(">>> QueryMediaInfo, MediaFilterMediaType = "+paramData.MediaFilterMediaType+", mediaType = "+mediaType)
    //console.log(">>> QueryMediaInfo, MediaFilterCategory = "+paramData.MediaFilterCategory
    //    +", MediaFilterMenuItem = "+paramData.MediaFilterMenuItem
    //    +", MediaFilterAlbumKey = "+paramData.MediaFilterAlbumKey
    //    +", MediaFilterAlbumName = "+paramData.MediaFilterAlbumName
    //    +", MediaFilterStartDate = "+paramData.MediaFilterStartDate
    //    +", MediaFilterSearchStr = "+paramData.MediaFilterSearchStr
    //)

    // Load the category list for the selected media type
    let mti = mediaType - 1;

    defaultCategory = mediaTypeData[mti].Category[0].CategoryName
    if (paramData.MediaFilterCategory == null || paramData.MediaFilterCategory == '' || paramData.MediaFilterCategory == '0' || paramData.MediaFilterCategory == 'DEFAULT') {
        paramData.MediaFilterCategory = defaultCategory
    }

    // Reset menuOrAlbumName (it will be set below if menu or album is specified)
    mediaInfo.menuOrAlbumName = ""

    // need the DEFAULT values to be set for the "first" query
    if (paramData.MediaFilterStartDate != null && paramData.MediaFilterStartDate != '') {
        if (paramData.MediaFilterStartDate == "DEFAULT") {
            paramData.MediaFilterStartDate = "1800-01-01"
            if (mediaType == 1) {
                // If Photos, default display to last 60 days
                paramData.MediaFilterStartDate = addDaysLocale(new Date(), -60)
            }
        } else {
            mediaFilterStartDate.value = paramData.MediaFilterStartDate.substring(0,10)
        }
    }

    // Check if a MenuItem is specified
    if (paramData.MediaFilterMenuItem != null && paramData.MediaFilterMenuItem != '') {
        mediaInfo.menuOrAlbumName = paramData.MediaFilterMenuItem
	}
    
    if (paramData.MediaFilterAlbumKey != null && paramData.MediaFilterAlbumKey != '') {
        if (paramData.MediaFilterAlbumName != null && paramData.MediaFilterAlbumName != '') {
            mediaInfo.menuOrAlbumName = paramData.MediaFilterAlbumName
        }
    }

    showLoadingSpinner(MediaPageMessage)
    try {
        const response = await fetchApi("GetMediaInfo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paramData)
        })
        await checkFetchResponse(response)
        // >>>>>>>>>>>>>>>>>  Should there be some kind of retry for certain failures?
        // Success
        let mediaInfoColl = await response.json()
        //console.log("mediaInfoList.length = ",mediaInfoColl.mediaInfoList.length,")
        mediaInfo.fileList.length = 0
        mediaInfo.fileList = mediaInfoColl.mediaInfoList
        mediaInfo.filterList = []

        // Set the Menu and Album elements on the initial load for this media type
        if (paramData.getMenu) {
            let mti = mediaType - 1
            mediaTypeDesc = mediaTypeData[mti].MediaTypeDesc
            contentDesc = mediaTypeDesc

            // Clear array before setting with values
            mediaInfo.menuList.length = 0
            categoryList.length = 0

            let cnt = 0;
            if (mediaTypeData[mti].Category != null) {
                let category = null
                for (let i = 0; i < mediaTypeData[mti].Category.length; i++) {
                    category = mediaTypeData[mti].Category[i]
                    categoryList.push(category.CategoryName)
                    cnt++

                    for (let j = 0; j < category.Menu.length; j++) {
                        menuFilter[menuFilter.length] = category.Menu[j].MenuItem;
                    }                    
    
                    let menuObject = 
                    {
                        category: category.CategoryName,
                        subMenuList: category.Menu
                    }
    
                    mediaInfo.menuList.push(menuObject)
                }
            }

            // Save the menu lists
            buildMenuElements(mediaType)
            // Moved from create-pages   (see if I just need to call when menu is built)
            buildFilterElements()
            // Query the album list and build the album menu
            queryMediaAlbum(paramData)
        }

        if (mediaInfo.fileList.length > 0) {
            mediaInfo.startDate = mediaInfo.fileList[0].takenDateTime.substring(0,10)
            mediaFilterStartDate.value = mediaInfo.startDate
            //console.log("Set mediaInfo.startDate = "+mediaInfo.startDate)

            // set the start date to the first file's date
            // and set the LAST for the Next filter

            // Set the filter list elements
            let currYear = mediaInfo.startDate.substring(0,4)
            let lastTakenDateTime = mediaInfo.fileList[mediaInfo.fileList.length-1].takenDateTime
            let filterRec = {
                filterName: "StartDate",
                startDate: mediaInfo.startDate
            }
            mediaInfo.filterList.push(filterRec)

            let prevYear = parseInt(mediaInfo.startDate.substring(0,4))-1
            filterRec = {
                filterName: "Prev Year",
                startDate: prevYear.toString()+"-01-01"
            }
            mediaInfo.filterList.push(filterRec)
        
            let maxRows = 150
            if (mediaType == 2) {
                maxRows = 12
            }

            if (mediaInfo.fileList.length >= maxRows) {
                filterRec = {
                    filterName: "Next",
                    startDate: lastTakenDateTime
                }
                mediaInfo.filterList.push(filterRec)
                //console.log("Next, startDate: lastTakenDateTime = "+lastTakenDateTime)
            }

            if (mediaType == 1 && mediaInfo.fileList.length > 50) {
                filterRec = {
                    filterName: "Winter",
                    startDate: currYear+"-01-01"
                }
                mediaInfo.filterList.push(filterRec)
                filterRec = {
                    filterName: "Spring",
                    startDate: currYear+"-04-01"
                }
                mediaInfo.filterList.push(filterRec)
                filterRec = {
                    filterName: "Summer",
                    startDate: currYear+"-07-01"
                }
                mediaInfo.filterList.push(filterRec)
                filterRec = {
                    filterName: "Fall",
                    startDate: currYear+"-10-01"
                }
                mediaInfo.filterList.push(filterRec)
                filterRec = {
                    filterName: "Winter",
                    startDate: currYear+"-12-01"
                }
                mediaInfo.filterList.push(filterRec)
            }

        } // if (mediaInfo.fileList.length > 0) {

        // Save the parameters from the laste query
        queryCategory = paramData.MediaFilterCategory
        querySearchStr = ""
        if (paramData.MediaFilterSearchStr != null && paramData.MediaFilterSearchStr != "") {
            querySearchStr = paramData.MediaFilterSearchStr
        }
        queryMenuItem = ""
        if (paramData.MediaFilterMenuItem != null & paramData.MediaFilterMenuItem != "") {
            queryMenuItem = paramData.MediaFilterMenuItem
        }
        queryAlbumKey = ""
        if (paramData.MediaFilterAlbumKey != null & paramData.MediaFilterAlbumKey != "") {
            queryAlbumKey = paramData.MediaFilterAlbumKey
        }

        contentDesc = mediaTypeDesc + " - " + queryCategory
        createMediaPage()
        MediaPageMessage.textContent = ""

    } catch (err) {
        console.error(err)
        MediaPageMessage.textContent = "Error getting media information: " + err.message
    }
    
} // queryMediaInfo

function executeFilter(inStartDate) {
    //console.log("Execute Filter ")
    //console.log("****  mediaFilterCategory = "+mediaFilterCategory.value)
    //console.log("**** mediaFilterStartDate = "+mediaFilterStartDate.value)
    //console.log("**** Filter   inStartDate = "+inStartDate)
    //console.log("**** mediaFilterSearchStr = "+mediaFilterSearchStr.value)

    let paramData = {
        MediaFilterMediaType: mediaType, 
        getMenu: false,
        MediaFilterCategory:  mediaFilterCategory.value,
        MediaFilterStartDate: inStartDate,
        MediaFilterSearchStr: mediaFilterSearchStr.value,
        MediaFilterMenuItem:  "",
        MediaFilterAlbumKey:  "",
        MediaFilterAlbumName: ""
    }

    queryMediaInfo(paramData);
}

//------------------------------------------------------------------------------------------------------------
// Create a collapsible menu from a directory structure
//------------------------------------------------------------------------------------------------------------
function buildFilterElements() {
    //console.log("$$$ buildFilterElements in data-repository.js, mediaType = "+mediaType)

    // Clear existing options
    mediaFilterCategory.options.length = 0

    // Populate the category select using the same selection logic as before
    for (let index in categoryList) {
        mediaFilterCategory.options[mediaFilterCategory.options.length] = new Option(categoryList[index], categoryList[index])
    }

    // Set initial values
    //mediaFilterStartDate.value = mediaInfo.startDate || ''
    mediaFilterStartDate.value = ""
    //mediaFilterSearchStr.value = querySearchStr || ''
    mediaFilterSearchStr.value = ""

    // Update content description
    if (contentDescEl) contentDescEl.textContent = contentDesc
}

//------------------------------------------------------------------------------------------------------------
// Query the database for media album list
//------------------------------------------------------------------------------------------------------------
export async function queryMediaAlbum(paramData) {
    try {
        const response = await fetchApi("GetMediaAlbum", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paramData)
        })
        await checkFetchResponse(response)
        // Success
        let mediaAlbumList = await response.json()
        //console.log("mediaAlbumList.length = ",mediaAlbumList.length)
        setAlbumList(mediaAlbumList)
        buildAlbumMenuElements(mediaType)

    } catch (err) {
        console.error(err)
        MediaPageMessage.textContent = "Error getting media album information: " + err.message
    }
    
} // queryMediaInfo


//------------------------------------------------------------------------------------------------------------
// Update the media info in the database table (Batch)
// (inIndex of -999 indicates a DELETE all selected records)
//------------------------------------------------------------------------------------------------------------
export async function updateMediaInfo(inIndex) {
    let index = -1
    if (inIndex != null) {
        if (inIndex >= 0 || inIndex == -999) {
            index = inIndex
        }
    }

    // Assume current values and selected files in the mediaInfo.fileList are what we want updated
    // unless the index is set, which indicates an individual update
    let paramData = {
        MediaFilterMediaType: mediaType,
        MediaInfoFileList: mediaInfo.fileList,
        FileListIndex: index
    }

    const response = await fetchApi("UpdateMediaInfo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paramData),
        requireAuth: true
    })
    const returnMsg = await response.json()
    //console.log("result = "+returnMsg, ", index = "+index)

    if (index >= 0) {
        updateMessage(returnMsg)
        // If individual index-based update, just de-Select but leave it in the file list
        mediaInfo.fileList[index].selected = false
    } else {
        // Filter out the Selected files (that were updated)
        updateAdminMessage(returnMsg)
        mediaInfo.fileList = mediaInfo.fileList.filter(checkSelected);
    }

    displayCurrFileList()
}

//------------------------------------------------------------------------------------------------------------
// Add new media info records in the database for new videos
//------------------------------------------------------------------------------------------------------------
export function newVideosMediaInfo() {
    let index = -1
    if (inIndex != null && inIndex >= 0) {
        index = inIndex
    }

    // Assume current values and selected files in the mediaInfo.fileList are what we want updated
    // unless the index is set, which indicates an individual update
    let paramData = {
        MediaFilterMediaType: mediaType,
        MediaInfoFileList: mediaInfo.fileList,
        index: index
    }

}

function checkSelected(fileInfo) {
    return !fileInfo.selected
}

//------------------------------------------------------------------------------------------------------------
// Create a collapsible menu in an offcanvas pop-out using menu list data
//------------------------------------------------------------------------------------------------------------
export function buildMenuElements(mediaType) {
    //let menuContainer = document.getElementById(MediaOffcanvasMenuId)
    let mediaMenuCanvasLabel = document.getElementById("MediaMenuCanvasLabel")
    mediaMenuCanvasLabel.textContent = mediaTypeDesc + " Menu"

    if (menuContainer != null) {
        empty(menuContainer)

            let menuId = MediaOffcanvasMenuId
            let accordionId = menuId + "AccordianContainer";
            let accordianContainer = document.createElement("div")
            accordianContainer.id = accordionId
            accordianContainer.classList.add('accordion')
            accordianContainer.classList.add('accordion-flush')
    
            let itemId = ''
            let accordianItemHeader
            let accordianItem
            let accordianItemBody
            let accordianItemList
            let collapseState = false
            let collapseShow = false
    
            for (let index in mediaInfo.menuList) {
                let menu = mediaInfo.menuList[index]

                if (menu.category == "ALL") {
                    continue;
                }
                
                // Make the 1st panel item un-collapsed
                if (index == 0) {
                    collapseState = false
                    collapseShow = true
                } else {
                    collapseState = true
                    collapseShow = false
                }
    
                // Create the top level item
                accordianItem = document.createElement("div")
                accordianItem.classList.add('accordion-item')
    
                // Create the header for the item
                itemId = menuId + (index + 1)
                accordianItemHeader = document.createElement("h6")
                accordianItemHeader.classList.add('accordion-header')
    
                let button = document.createElement("button");
                button.classList.add('m-1','p-1','accordion-button','shadow-none')
                if (collapseState) {
                    button.classList.add('collapsed')
                }
                button.setAttribute('type',"button")
                button.setAttribute('role',"button")
                button.setAttribute('data-bs-toggle','collapse')
                button.setAttribute('data-bs-target','#' + itemId)
                button.textContent = menu.category;
                accordianItemHeader.appendChild(button)
    
                // Create the body for the item
                accordianItemBody = document.createElement("div")
                accordianItemBody.id = itemId
                accordianItemBody.classList.add('accordion-collapse','collapse')
                if (collapseShow) {
                    accordianItemBody.classList.add('show')
                }
                accordianItemBody.setAttribute('data-bs-parent', '#' + accordionId)
    
                // Create the list for the body
                accordianItemList = document.createElement("ul")
    
                // Add list entries
                for (let index2 in menu.subMenuList) {
                    //console.log("create menu,  filename = "+filename);
                    // Create a link for the media dir folder
                    let a = document.createElement("a")
                    a.setAttribute('href', "#")
                    a.setAttribute('data-MediaType', mediaType)
                    a.setAttribute('data-category', menu.category)
                    a.setAttribute('data-menuItem', menu.subMenuList[index2].MenuItem)
                    a.classList.add(MediaMenuRequestClass)
                    a.textContent = menu.subMenuList[index2].MenuItem
                    let li = document.createElement('li')
                    li.appendChild(a)
                    accordianItemList.appendChild(li)
                }
    
                // Append the item list to the panel item, and the panel item to the menu
                accordianItemBody.appendChild(accordianItemList);
                accordianItem.appendChild(accordianItemHeader);
                accordianItem.appendChild(accordianItemBody);
                accordianContainer.appendChild(accordianItem);
            }    
    
        // Put the created accordian into the Menu DIV on the parent page
        menuContainer.appendChild(accordianContainer);
    }
}

//------------------------------------------------------------------------------------------------------------
// Create a collapsible menu in an offcanvas pop-out using menu list data
//------------------------------------------------------------------------------------------------------------
export function buildAlbumMenuElements(mediaType) {
    mediaAlbumMenuCanvasLabel.textContent = mediaTypeDesc + " Albums"

    if (menuAlbumContainer != null) {
        empty(menuAlbumContainer)

        let itemList = document.createElement("ul")

        for (let index in albumList) {
            let albumRec = albumList[index]

            let a = document.createElement("a")
            a.setAttribute('href', "#")
            a.setAttribute('data-MediaType', mediaType)
            a.setAttribute('data-albumKey', albumRec.albumKey)
            a.setAttribute('data-albumName', albumRec.albumName)
            a.classList.add(MediaAlbumMenuRequestClass)
            a.textContent = albumRec.albumName + " (" + albumRec.albumKey + ")"

            let li = document.createElement('li')
            li.appendChild(a)
            itemList.appendChild(li)
        }

        menuAlbumContainer.appendChild(itemList)
    }
}

export function setMenuFilter(categoryName) {
    // Clear the array
    menuFilter = []
    menuFilter.length = 0
    let mti = mediaType - 1
    if (categoryName == "ALL") {
        for (let index in mediaTypeData[mti].Category) {
            for (let index2 in mediaTypeData[mti].Category[index].Menu) {
                menuFilter[menuFilter.length] = mediaTypeData[mti].Category[index].Menu[index2].MenuItem
            }
        }
    } else {
        for (let index in mediaTypeData[mti].Category) {
            if (mediaTypeData[mti].Category[index].CategoryName == categoryName) {
                for (let index2 in mediaTypeData[mti].Category[index].Menu) {
                    menuFilter[menuFilter.length] = mediaTypeData[mti].Category[index].Menu[index2].MenuItem
                }
            }
        }
    }
}
