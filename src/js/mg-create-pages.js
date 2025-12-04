/*==============================================================================
(C) Copyright 2023 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  CreatePages uses the data in MediaInfo array to dynamically
                build the web page display of image thumbnails and filter
                buttons to allow browse and select.  It also recognizes an
                Admin and builds a display to edit/update media information
--------------------------------------------------------------------------------
Modification History
2023-09-08 JJK  Initial version - moved create page components to this module
--------------------------------------------------------------------------------
2024-03-29 JJK  Migrating to Azure SWA, blob storage, Cosmos DB with GraphQL
                for queries.  Also, removing Admin functions to make this just
                the presentation functions with no edit
2025-12-04 JJK  Re-implementing the Edit functions to update multiple mediaInfo
                documents (as opposed to the single update in contextmenu)
================================================================================*/
import {empty} from './util.js';
import {isAdmin,mediaType,mediaInfo,getFilePath,getFileName,categoryList,menuFilter,setMenuFilter,
    querySearchStr,queryMenuItem,queryAlbumKey,queryMediaInfo,queryCategory} from './mg-data-repository.js'
import {setContextMenuListeners} from './mg-contextmenu.js'
import {displayElementInLightbox} from './mg-lightbox.js'
import {playlistSongClass,audioPrevClass,audioNextClass,audioPlayer,setAudioListeners,
        emptyPlaylist,incrementPlaylistIndex,addSongToPlaylist,initSong} from './mg-audio-playlist.js'
import {setPeopleListeners} from './mg-people.js'

const MediaFilterRequestClass = "MediaFilterRequest";
const imgThumbnailClass = "img-thumbnail-jjk"  // Want my own thumbnail formatting instead of bootstrap border
const thumbCheckboxClass = "thumb-checkbox"

var mediaPageContainer = document.getElementById("MediaPage");
var thumbnailContainer = document.createElement("div")
var editRow1 = document.createElement("div")
var editMode = false

var mediaAdminMessage
var mediaCategorySelect
var mediaMenuSelect
var mediaPeopleInput
var mediaPeopleSelect
var mediaPeopleList

var mediaDetailFilename
var mediaDetailTitle
var mediaDetailTaken
var mediaDetailImg
var mediaDetailCategoryTags
var mediaDetailMenuTags
var mediaDetailAlbumTags
var mediaDetailPeopleList
var mediaDetailDescription
// NEW ones
var mediaDetailVideoList
var editModeToggle
var editModeToggleInput
var editModeToggleLabel

var currIndex = 0
var currSelectAll = false

document.addEventListener('DOMContentLoaded', () => {
    mediaPageContainer = document.getElementById("MediaPage");
    thumbnailContainer = document.createElement("div")
    editRow1 = document.createElement("div")

    editModeToggle = document.createElement("div")
    editModeToggle.classList.add('form-check','form-switch','mt-1','ms-2','float-end')
    editModeToggleInput = document.createElement("input")
    editModeToggleInput.classList.add('form-check-input','shadow-none')
    editModeToggleInput.setAttribute('type',"checkbox")
    editModeToggleInput.setAttribute('role',"switch")
    editModeToggleInput.id = "editModeSwitch"
    editModeToggleInput.name = "editModeSwitch"
    editModeToggleInput.addEventListener("change", (event) => {
        if (event.target.checked) {
            editMode = true
            createMediaPage()
        } else {
            editMode = false
            createMediaPage()
        }
    })
    editModeToggleLabel = document.createElement("label")
    editModeToggleLabel.classList.add('form-check-label')
    editModeToggleLabel.setAttribute('for',"editModeSwitch")
    editModeToggleLabel.textContent = "Edit"
    editModeToggle.appendChild(editModeToggleInput)
    editModeToggle.appendChild(editModeToggleLabel)

    // Set the container and class for the contextmenu
    setContextMenuListeners(thumbnailContainer, imgThumbnailClass)
    setAudioListeners(thumbnailContainer)

    //-------------------------------------------------------------------------------------------------------
    // Listen for clicks in containers
    //-------------------------------------------------------------------------------------------------------
    thumbnailContainer.addEventListener("click", function (event) {
        //console.log("thumbnailContainer click, classList = "+event.target.classList)

        if (event.target && event.target.classList.contains(MediaFilterRequestClass)) {
            // If click on a Filter Request (like Next or Prev), query the data and build the thumbnail display
            //console.log(">>> FilterRequest data-category  = "+event.target.getAttribute('data-category'))
            //console.log(">>> FilterRequest data-startDate = "+event.target.getAttribute('data-startDate'))
            //console.log(">>> FilterRequest data-searchStr = "+event.target.getAttribute('data-searchStr'))
            //console.log(">>> FilterRequest data-menuItem  = "+event.target.getAttribute('data-menuItem'))

            let paramData = {
                MediaFilterMediaType: mediaType, 
                getMenu: false,
                MediaFilterCategory:  event.target.getAttribute('data-category'),
                MediaFilterStartDate: event.target.getAttribute('data-startDate'),
                MediaFilterMenuItem: event.target.getAttribute('data-menuItem'),
                MediaFilterAlbumKey: event.target.getAttribute('data-albumKey'),
                MediaFilterSearchStr: event.target.getAttribute('data-searchStr')}

            queryMediaInfo(paramData);

        } else if (event.target && event.target.classList.contains(imgThumbnailClass)) {
            event.preventDefault();
            // If clicking on a Thumbnail, bring up in Lightbox or FileDetail (for Edit mode)
            let index = parseInt(event.target.getAttribute('data-index'))
            if (typeof index !== "undefined" && index !== null) {
                displayElementInLightbox(index)
                //displayFileDetail(index)
            }
        } else if (event.target && event.target.classList.contains(thumbCheckboxClass)) {
            // Thumbnail card checkbox
            //console.log("Clicked on image checkbox")
            let index = parseInt(event.target.getAttribute('data-index'))
            if (typeof index !== "undefined" && index !== null) {
                if (mediaInfo.fileList[index].selected) {
                    mediaInfo.fileList[index].selected = false
                } else {
                    mediaInfo.fileList[index].selected = true
                    if (editMode) {
                        displayFileDetail(index)
                    }
                }
            }
        } 
    })
})

/*
var nonAlphaNumericSpaceCharsStr = "[\x01-\x1F\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F]";
// "g" global so it does more than 1 substitution
var regexNonAlphaNumericSpaceChars = new RegExp(nonAlphaNumericSpaceCharsStr, "g");
function cleanInputStr(inStr) {
    // Remove all NON-alphanumeric or space characters
    return inStr.replace(regexNonAlphaNumericSpaceChars, '');
}
*/

//------------------------------------------------------------------------------------------------------------
// Dynamically create the DOM elements to add to the Media Page div (either regular display or EDIT mode)
//------------------------------------------------------------------------------------------------------------
export function createMediaPage() {
    //console.log("$$$$ in the createMediaPage")
    empty(thumbnailContainer)
    empty(editRow1)

    if (editMode) {
            // Create Row and columns
            editRow1.classList.add('row')

            // Col 1
            let editRow1Col1 = document.createElement("div")
            editRow1Col1.classList.add('col-sm-5','col-md-6')

            editRow1Col1.appendChild(thumbnailContainer);
            editRow1.appendChild(editRow1Col1)

            // Col 2
            let editRow1Col2 = document.createElement("div")
            editRow1Col2.classList.add('col-sm-4','col-md-4')

            // GetNEW
            let getNewButton = document.createElement("button")
            getNewButton.classList.add('btn','btn-success','btn-sm','float-start','shadow-none','me-2','my-2')
            getNewButton.setAttribute('type',"button")
            getNewButton.setAttribute('role',"button")
            getNewButton.textContent = "Get NEW"
            editRow1Col2.appendChild(getNewButton)
            getNewButton.addEventListener("click", function () {
                let paramData = {
                    MediaFilterMediaType: mediaType, 
                    getNew: true}
                queryMediaInfo(paramData);
            });

            // SelectALL
            let selectAllButton = document.createElement("button")
            selectAllButton.classList.add('btn','btn-primary','btn-sm','float-start','shadow-none','me-2','my-2')
            selectAllButton.setAttribute('type',"button")
            selectAllButton.setAttribute('role',"button")
            selectAllButton.textContent = "Select ALL"
            editRow1Col2.appendChild(selectAllButton)
            selectAllButton.addEventListener("click", function () {
                currIndex = 0
                if (currSelectAll == true) {
                    currSelectAll = false
                } else {
                    currSelectAll = true
                }
                // Loop through the current file list and set all to Selected
                for (let index in mediaInfo.fileList) {
                    mediaInfo.fileList[index].selected = currSelectAll
                }        
                //displayFileDetail(currIndex) <<<<< can't select the 1st one because that will turn off the selected for all the rest
                displayCurrFileList()
            });

            // Prev
            let detailPrevButton = document.createElement("button")
            //detailPrevButton.id = "MediaAdminSelectAllButton"
            detailPrevButton.classList.add('btn','btn-warning','btn-sm','float-start','shadow-none','me-2','my-2')
            detailPrevButton.setAttribute('type',"button")
            detailPrevButton.setAttribute('role',"button")
            detailPrevButton.textContent = "Prev"
            editRow1Col2.appendChild(detailPrevButton)
            detailPrevButton.addEventListener("click", function () {
                if (currIndex > 0) {
                    currIndex -= 1
                    displayFileDetail(currIndex)
                }            
            });

            // Next
            let detailNextButton = document.createElement("button")
            //detailNextButton.id = "MediaAdminGetNewButton"
            detailNextButton.classList.add('btn','btn-info','btn-sm','float-start','shadow-none','me-2','my-2')
            detailNextButton.setAttribute('type',"button")
            detailNextButton.setAttribute('role',"button")
            detailNextButton.textContent = "Next"
            editRow1Col2.appendChild(detailNextButton)
            detailNextButton.addEventListener("click", function () {
                if (currIndex < mediaInfo.fileList.length-1) {
                    currIndex += 1
                    displayFileDetail(currIndex)
                }            
            });

            // *** Detail TAGS ***
            mediaDetailFilename = document.createElement("div")
            editRow1Col2.appendChild(mediaDetailFilename)
    
            mediaDetailTitle = document.createElement("input")
            mediaDetailTitle.classList.add('form-control','py-1','mb-1','shadow-none')
            mediaDetailTitle.setAttribute('type', "text")
            mediaDetailTitle.setAttribute('placeholder', "Title")
            editRow1Col2.appendChild(mediaDetailTitle)
    
            mediaDetailTaken = document.createElement("input")
            mediaDetailTaken.classList.add('form-control','py-1','mb-1','shadow-none')
            mediaDetailTaken.setAttribute('type', "text")
            mediaDetailTaken.setAttribute('placeholder', "Taken DateTime")
            editRow1Col2.appendChild(mediaDetailTaken)

            if (mediaType == 1) {
                mediaDetailImg = document.createElement("img")
                mediaDetailImg.classList.add('img-fluid','rounded','mx-auto','d-block')
                //mediaDetailImg.setAttribute('onerror', "this.onerror=null; this.remove()")
                mediaDetailImg.setAttribute('onerror', "this.onerror=null;this.src='https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg';")
                editRow1Col2.appendChild(mediaDetailImg)

            } else if (mediaType == 2) {
                //-----------------------------------------------------------------------------------------
                // Build a UI to add new videos
                //-----------------------------------------------------------------------------------------
                let newVideosButton = document.createElement("button")
                newVideosButton.classList.add('btn','btn-danger','btn-sm','float-start','shadow-none','me-2','my-2')
                newVideosButton.setAttribute('type',"button")
                newVideosButton.setAttribute('role',"button")
                newVideosButton.textContent = "Add NEW Videos"
                editRow1Col2.appendChild(newVideosButton)

                mediaDetailVideoList = document.createElement("textarea")
                mediaDetailVideoList.classList.add('form-control','py-1','mb-1','shadow-none')
                mediaDetailVideoList.setAttribute('rows', "12")
                mediaDetailVideoList.setAttribute('placeholder', "List of new video id's (and titles)")
                editRow1Col2.appendChild(mediaDetailVideoList)
                
                newVideosButton.addEventListener("click", function () {
                    let paramData = {
                        MediaFilterMediaType: mediaType, 
                        newVideos: true,
                        mediaCategoryName: mediaCategorySelect.value,
                        videoMenuItem: mediaDetailTitle.value,
                        videoTaken: mediaDetailTaken.value,
                        videoList: mediaDetailVideoList.value,
                        videoDescription: mediaDetailDescription.value
                    }
                    newVideosMediaInfo(paramData)
                });
            }
            editRow1.appendChild(editRow1Col2)

            // Col 3
            let editRow1Col3 = document.createElement("div")
            editRow1Col3.classList.add('col-sm-3','col-md-2')
            // Category
            mediaCategorySelect = document.createElement("select")
            mediaCategorySelect.classList.add('form-select','float-start','shadow-none','mt-2','py-1')
            // Populate the category select using the categoryList from data-repository
            for (let index in categoryList) {
                mediaCategorySelect.options[mediaCategorySelect.options.length] = new Option(categoryList[index], categoryList[index])
            }
            // When the Category changes, set the menuFilter menu items for that Category
            mediaCategorySelect.addEventListener("change", function () {
                // set menuFilter array based on selected CategoryName
                setMenuFilter(mediaCategorySelect.value)
                // Clear the menu options and re-load from current menuFilter
                mediaMenuSelect.options.length = 0
                for (let index in menuFilter) {
                    mediaMenuSelect.options[mediaMenuSelect.options.length] = new Option(menuFilter[index], menuFilter[index])
                }
            })
            editRow1Col3.appendChild(mediaCategorySelect);

            setMenuFilter(mediaCategorySelect.value)
            mediaMenuSelect = document.createElement("select")
            mediaMenuSelect.classList.add('form-select','float-start','shadow-none','mt-2','py-1')
            for (let index in menuFilter) {
                // a clever way of adding to the end of the options object collection
                mediaMenuSelect.options[mediaMenuSelect.options.length] = new Option(menuFilter[index], menuFilter[index])
            }
            editRow1Col3.appendChild(mediaMenuSelect);

            //-------------------------------------------------------------------------------------------------------------
            // *** People list ***
            //-------------------------------------------------------------------------------------------------------------
            mediaPeopleList = document.createElement("input")
            mediaPeopleList.classList.add('form-control','shadow-none','py-1')
            mediaPeopleList.setAttribute('type',"text")
            mediaPeopleList.setAttribute('placeholder',"People list")
            let peopleButton = document.createElement("button")
            peopleButton.classList.add('btn','btn-danger','btn-sm','float-start','shadow-none','me-2','my-1')
            peopleButton.setAttribute('type',"button")
            peopleButton.setAttribute('role',"button")
            peopleButton.textContent = "People"
            editRow1Col3.appendChild(peopleButton)
            // Load people
            setPeopleListeners(peopleButton,mediaPeopleList)
            editRow1Col3.appendChild(mediaPeopleList);

            // Update
            let editUpdateButton = document.createElement("button")
            editUpdateButton.classList.add('btn','btn-info','btn-sm','float-start','shadow-none','mt-3','me-2')
            editUpdateButton.setAttribute('type',"button")
            editUpdateButton.setAttribute('role',"button")
            editUpdateButton.textContent = "Update Selected"
            editRow1Col3.appendChild(editUpdateButton)
            editUpdateButton.addEventListener("click", function () {
                //console.log("mediaCategorySelect.value = "+mediaCategorySelect.value)
                //console.log("mediaMenuSelect.value = "+mediaMenuSelect.value)
                //console.log("mediaPeopleList.value = "+mediaPeopleList.value)
                mediaAdminMessage.textContent = ""

                // update to selected objects in adminFileList
                for (let index in mediaInfo.fileList) {
                    let fi = mediaInfo.fileList[index]
                    if (fi.selected) {
                        if (mediaDetailTitle.value != "") {
                            fi.title = mediaDetailTitle.value
                        }
                        if (mediaDetailTaken.value != "") {
                            fi.takenDateTime = mediaDetailTaken.value
                        }
                        fi.categoryTags = mediaCategorySelect.value
                        mediaDetailCategoryTags.value = mediaCategorySelect.value
                        fi.menuTags = mediaMenuSelect.value
                        mediaDetailMenuTags.value = mediaMenuSelect.value
                        fi.albumTags = mediaDetailAlbumTags.value
                        fi.people = mediaPeopleList.value
                        mediaDetailPeopleList.value = mediaPeopleList.value
                        fi.description = mediaDetailDescription.value
                    }
                }
            });
        
            // Save
            let editSaveButton = document.createElement("button")
            //editSaveButton.id = "MediaAdminSaveButton"
            editSaveButton.classList.add('btn','btn-success','btn-sm','float-start','shadow-none','mt-3','me-2','mb-3')
            editSaveButton.setAttribute('type',"button")
            editSaveButton.setAttribute('role',"button")
            editSaveButton.textContent = "Save to DB"
            editRow1Col3.appendChild(editSaveButton)
            editSaveButton.addEventListener("click", function () {
                currIndex = 0
                updateMediaInfo()
            });

            // Category Tags
            mediaDetailCategoryTags = document.createElement("input")
            //mediaDetailCategoryTags.id = "MediaDetailCategoryTags"
            mediaDetailCategoryTags.classList.add('form-control','py-1','mb-1','shadow-none')
            mediaDetailCategoryTags.setAttribute('type', "text")
            mediaDetailCategoryTags.setAttribute('placeholder', "Category tags")
            mediaDetailCategoryTags.disabled = true
            editRow1Col3.appendChild(mediaDetailCategoryTags)

            // Menu Tags
            mediaDetailMenuTags = document.createElement("input")
            //mediaDetailMenuTags.id = "MediaDetailMenuTags"
            mediaDetailMenuTags.classList.add('form-control','py-1','mb-1','shadow-none')
            mediaDetailMenuTags.setAttribute('type', "text")
            mediaDetailMenuTags.setAttribute('placeholder', "Menu tags")
            mediaDetailMenuTags.disabled = true
            editRow1Col3.appendChild(mediaDetailMenuTags)

            // Album Tags
            mediaDetailAlbumTags = document.createElement("input")
            //mediaDetailAlbumTags.id = "MediaDetailAlbumTags"
            mediaDetailAlbumTags.classList.add('form-control','py-1','mb-1','shadow-none')
            mediaDetailAlbumTags.setAttribute('type', "text")
            mediaDetailAlbumTags.setAttribute('placeholder', "Album tags")
            editRow1Col3.appendChild(mediaDetailAlbumTags)

            // People List
            mediaDetailPeopleList = document.createElement("input")
            //mediaDetailPeopleList.id = "MediaDetailPeopleList"
            mediaDetailPeopleList.classList.add('form-control','py-1','mb-1','shadow-none')
            mediaDetailPeopleList.setAttribute('type', "text")
            mediaDetailPeopleList.setAttribute('placeholder', "People list")
            mediaDetailPeopleList.disabled = true  //<<<<<<<<<<<<<<<<<<<<<<<<<<<<
            editRow1Col3.appendChild(mediaDetailPeopleList)

            // Description
            mediaDetailDescription = document.createElement("textarea")
            //mediaDetailDescription.id = "MediaDetailDescription"
            mediaDetailDescription.classList.add('form-control','py-1','mb-1','shadow-none')
            mediaDetailDescription.setAttribute('rows', "6")
            mediaDetailDescription.setAttribute('placeholder', "Description")
            //mediaDetailDescription.value = fi.description
            editRow1Col3.appendChild(mediaDetailDescription)

            // Admin Message
            mediaAdminMessage = document.createElement("div")
            mediaAdminMessage.id = "MediaAdminMessage"
            mediaAdminMessage.classList.add('float-start')
            mediaAdminMessage.textContent = "Number of images = " + (mediaInfo.fileList.length)
            editRow1Col3.appendChild(mediaAdminMessage)
            editRow1.appendChild(editRow1Col3)

        mediaPageContainer.appendChild(editRow1);
    } else {
        // Regular display mode (non-admin)
        mediaPageContainer.appendChild(thumbnailContainer);
    }

    displayCurrFileList()
}

export function updateAdminMessage(displayMessage) {
    if (mediaAdminMessage != null) {
        mediaAdminMessage.textContent = displayMessage
    }
}
    
    //===========================================================================================================
    // Display the current list image thumbnails in the thumbnail container (with appropriate class links)
    //===========================================================================================================
    export function displayCurrFileList() {
        let docFiles = false
        let audioFiles = false
        let doclistTbody = document.createElement("tbody")
        let playlistTbody = document.createElement("tbody")

        empty(thumbnailContainer)
        emptyPlaylist()
        let plIndex = 0

        let thumbnailRow1 = document.createElement("div")
        let thumbnailRow2 = document.createElement("div")
        let thumbnailRow3 = document.createElement("div")
        thumbnailRow1.classList.add('row')
        thumbnailRow2.classList.add('row')
        thumbnailRow3.classList.add('row')

        let thumbnailRow1Col1 = document.createElement("div")
        let thumbnailRow2Col1 = document.createElement("div")
        let thumbnailRow3Col1 = document.createElement("div")
        thumbnailRow1Col1.classList.add('col')
        thumbnailRow2Col1.classList.add('col','my-2')
        thumbnailRow3Col1.classList.add('col')

        //-------------------------------------------------------------------------------------------------------------------------
        // Loop through all the files in the current file list
        //-------------------------------------------------------------------------------------------------------------------------
        for (let index in mediaInfo.fileList) {
            let fi = mediaInfo.fileList[index]

            // Create a Card to hold the thumbnail of the media object
            let thumb = document.createElement("div")
            //thumb.classList.add('card','fs-6','vh-75','float-start','m-1')
            thumb.classList.add('card','fs-6','vh-75','float-start')

            let titleMax = 25
            if (mediaType == 1) {
                titleMax = 12
            }

            if (editMode) {
                // If EditMode, add a checkbox to the thumb card
                let cardCheckboxDiv = document.createElement("div")
                cardCheckboxDiv.classList.add('form-check','mx-1','float-start','shadow-none')

                let cardCheckbox = document.createElement("input")
                //cardCheckbox.classList.add('form-check-input','mx-1','mb-1','float-end','shadow-none',thumbCheckboxClass)
                cardCheckbox.classList.add('form-check-input','shadow-none',thumbCheckboxClass)
                cardCheckbox.id = 'cb' + index
                cardCheckbox.setAttribute('type', 'checkbox')
                cardCheckbox.setAttribute('data-index', index)
                cardCheckbox.checked = fi.selected
                cardCheckboxDiv.appendChild(cardCheckbox)

                let cbLabel = document.createElement("label")
                cbLabel.classList.add('form-check-label')
                cbLabel.setAttribute('for',cardCheckbox.id)
                if (fi.title.length > titleMax) {
                    cbLabel.textContent = fi.title.substring(0,titleMax)
                } else {
                    cbLabel.textContent = fi.title
                }
                cardCheckboxDiv.appendChild(cbLabel)

                thumb.appendChild(cardCheckboxDiv)
            }

            //-------------------------------------------------------------------------------------------------------------------
            // Display thumbnail according to media type (and add event links for lightbox and edit)
            //-------------------------------------------------------------------------------------------------------------------
            if (mediaType == 1) {
                let img = document.createElement("img");
                // add a class for event click
                if (editMode) {
                    img.classList.add('rounded','float-start','m-2',imgThumbnailClass)
                } else {
                    img.classList.add('rounded','float-start','me-2','mb-2',imgThumbnailClass)
                }
                img.setAttribute('onerror', "this.onerror=null; this.remove()")
                img.src = getFilePath(index,"Thumbs")
                img.setAttribute('data-index', index)
                // Thumbnails are created as 130 x 130, but display is 110?
                // 2024-04-06 Testing 120, but 110 seems better
                img.height = 110

                // Make sure the 1st image is cached (for the lightbox display)
                if (index == 0) {
                    var imgCache = document.createElement('img')
                    imgCache.src = getFilePath(index,"Smaller")
                }

                if (editMode) {
                    thumb.appendChild(img)
                } else {
                    thumb = img
                }

                // *** For Testing ***
                //let videoLabel = document.createElement("label")
                //videoLabel.classList.add('mx-1')
                //videoLabel.textContent = fi.name.substring(0,20) + " " + fi.takenDateTime
                //thumb.appendChild(videoLabel)
                //thumb.appendChild(img)

                thumbnailRow2Col1.appendChild(thumb)

            } else if (mediaType == 2) {
                let videoLabel = document.createElement("label")
                videoLabel.classList.add('mx-1')
                if (fi.title.length > titleMax) {
                    videoLabel.textContent = fi.title.substring(0,titleMax)
                } else {
                    videoLabel.textContent = fi.title
                }
                thumb.appendChild(videoLabel)

                let iframe = document.createElement("iframe")
                iframe.classList.add('m-1')
                // Use the embed link for iframe (without https so it can be run locally for testing)
                iframe.setAttribute('src', "//www.youtube.com/embed/" + fi.name)
                iframe.setAttribute('allowfullscreen', true)

                //iframe.style.width = "230px";
                iframe.style.width = "310px";
                //iframe.style.height = "140px";
                iframe.style.height = "220px";

                thumb.appendChild(iframe)
                thumbnailRow2Col1.appendChild(thumb)

            } else if (mediaType == 3) {
                // MUSIC
                audioFiles = true;
                plIndex = incrementPlaylistIndex()
                addSongToPlaylist({ "title": getFileName(index), "url": getFilePath(index) })
                
                // add the table rows for the playlist
                // build a table then append to the thumbnail container
                let a = document.createElement("a")
                a.classList.add('class', `${playlistSongClass}`)
                a.setAttribute('data-plIndex', plIndex);
                a.setAttribute('role', 'button');
                a.textContent = getFileName(index)
                let td = document.createElement("td");
                td.appendChild(a);
                let tr = document.createElement("tr");
                tr.appendChild(td);
                playlistTbody.appendChild(tr)

            } else if (mediaType == 4) {
                // DOCS
                    
                //console.log("PDF file = " + fi.name + ", filePath = " + filePath);
                docFiles = true
                let a = document.createElement("a")
                a.href = getFilePath(index)
                a.setAttribute('target',"_blank");
                a.textContent = getFileName(index)
                let td = document.createElement("td");
                td.appendChild(a);
                let tr = document.createElement("tr");
                tr.classList.add("smalltext")
                tr.appendChild(td);
                doclistTbody.appendChild(tr)
            }
        } //   for (let index in mediaInfo.fileList) {
        

        // if there were any docs, build a table of the filelinks and append to the Thumbnails container\
        if (docFiles) {
            empty(thumbnailRow2Col1);

            let table = document.createElement("table");
            table.classList.add('table','table-sm')
            table.appendChild(doclistTbody)
            thumbnailRow2Col1.appendChild(table)
        }
        else if (audioFiles) {
            empty(thumbnailRow2Col1);

                // if there were any MP3's, build a player with the playlist of MP3's
                let h6 = document.createElement("h6");
                h6.id = 'SongTitle'
                h6.textContent = initSong(0)
                thumbnailRow2Col1.appendChild(h6)

                // Append the audioPlayer element
                thumbnailRow2Col1.appendChild(audioPlayer);

                let i = document.createElement("i");
                i.classList.add('fa',`${audioPrevClass}`,'fa-3x')
                let a = document.createElement("a")
                a.id = "AudioPrev"
                //a.href = "#"
                a.appendChild(i)
                thumbnailRow2Col1.appendChild(a)

                i = document.createElement("i");
                i.classList.add('fa',`${audioNextClass}`,'fa-3x','mx-3')
                a = document.createElement("a")
                a.id = "AudioNext"
                //a.href = "#"
                a.appendChild(i)
                thumbnailRow2Col1.appendChild(a)

            // append the tbody rows to the table, and the table to the Col1 (and thumbnail container)
            let playlistTable = document.createElement("table");
            playlistTable.id = 'PlaylistDisplay'
            playlistTable.classList.add('table', 'table-sm', 'mt-3')
            playlistTable.appendChild(playlistTbody)

            let row = document.createElement("div");
            row.id = 'PlaylistRow'
            row.classList.add('row')
            let col1 = document.createElement("div");
            col1.classList.add('col-sm-7')
            col1.appendChild(playlistTable)
            row.appendChild(col1)
 
            thumbnailRow2Col1.appendChild(row)
        }

        //----------------------------------------------------------------------------------------------------
        // If there is a filter request list, create Filter Request buttons with the start date
        //----------------------------------------------------------------------------------------------------
        let buttonMax = 20
        if (window.innerHeight > window.innerWidth) {
            buttonMax = 4
        }

        if (mediaInfo.filterList != null) {
            let buttonColor = 'btn-primary'
            for (let index in mediaInfo.filterList) {
                let FilterRec = mediaInfo.filterList[index]
                if (FilterRec.filterName == 'StartDate') {
                    continue
                }
                if (index > buttonMax) {
                    continue
                }

                buttonColor = 'btn-primary'
                if (FilterRec.filterName == 'Winter') {
                    buttonColor = 'btn-secondary'
                } else if (FilterRec.filterName == 'Spring') {
                    buttonColor = 'btn-success'
                } else if (FilterRec.filterName == 'Summer') {
                    buttonColor = 'btn-danger'
                } else if (FilterRec.filterName == 'Fall') {
                    buttonColor = 'btn-warning'
                } else if (FilterRec.filterName == 'Next') {
                    buttonColor = 'btn-info'
                }

                let button = document.createElement("button")
                button.setAttribute('type',"button")
                button.setAttribute('role',"button")
                button.setAttribute('data-MediaType', mediaType)
                button.setAttribute('data-category', queryCategory)
                button.setAttribute('data-startDate', FilterRec.startDate)
                button.setAttribute('data-menuItem', queryMenuItem)
                button.setAttribute('data-albumKey', queryAlbumKey)
                button.setAttribute('data-searchStr', querySearchStr)
                button.classList.add('btn',buttonColor,'btn-sm','shadow-none','me-2','mt-2',MediaFilterRequestClass)
                button.textContent = FilterRec.filterName
                thumbnailRow1Col1.appendChild(button)

                // If too many thumbnails, duplicate button at the bottom
                if (mediaInfo.fileList.length > 50) {
                    let button2 = document.createElement("button")
                    button2.setAttribute('type',"button")
                    button2.setAttribute('role',"button")
                    button2.setAttribute('data-MediaType', mediaType)
                    button2.setAttribute('data-category', queryCategory)
                    button2.setAttribute('data-startDate', FilterRec.startDate)
                    button2.setAttribute('data-menuItem', queryMenuItem)
                    button2.setAttribute('data-albumKey', queryAlbumKey)
                    button2.setAttribute('data-searchStr', querySearchStr)
                    button2.classList.add('btn',buttonColor,'btn-sm','shadow-none','me-2','mb-2',MediaFilterRequestClass)
                    button2.textContent = FilterRec.filterName
                    thumbnailRow3Col1.appendChild(button2)
                }
            }
            if (mediaType == 1 && mediaInfo.fileList.length > 50) {
                let buttonTop = document.createElement("button")
                buttonTop.setAttribute('type',"button")
                buttonTop.setAttribute('role',"button")
                buttonTop.classList.add('btn','btn-primary','btn-sm','shadow-none','me-2','mb-2')
                buttonTop.textContent = "Top"
                thumbnailRow3Col1.appendChild(buttonTop)
                buttonTop.addEventListener("click", function () {
                    window.scrollTo(0, 0)
                });
            }
        }

        if (isAdmin) {
            thumbnailRow1Col1.appendChild(editModeToggle)
        }

        // Add the Menu or Album name as row 0 (if it is non-blank)
        if (mediaInfo.menuOrAlbumName != null && mediaInfo.menuOrAlbumName != "") {
            let thumbnailRow0 = document.createElement("div")
            thumbnailRow0.classList.add('row')
            let thumbnailRow0Col1 = document.createElement("div")
            thumbnailRow0Col1.classList.add('col','mt-2','ms-1')
            let headerText = document.createElement("h6");
            headerText.textContent = mediaInfo.menuOrAlbumName
            thumbnailRow0Col1.appendChild(headerText)
            thumbnailRow0.appendChild(thumbnailRow0Col1)
            thumbnailContainer.appendChild(thumbnailRow0)
        }

        thumbnailRow1.appendChild(thumbnailRow1Col1)
        thumbnailRow2.appendChild(thumbnailRow2Col1)
        thumbnailRow3.appendChild(thumbnailRow3Col1)
        thumbnailContainer.appendChild(thumbnailRow1)
        thumbnailContainer.appendChild(thumbnailRow2)
        thumbnailContainer.appendChild(thumbnailRow3)
    }

    //-------------------------------------------------------------------------------------------------------
    // Display individual image for Edit mode
    //-------------------------------------------------------------------------------------------------------
    function displayFileDetail(index) {
        //console.log("index = "+index)
        currIndex = index
        
        // Get the correct image from the file list, and set the values of the screen components
        let fi = mediaInfo.fileList[index]

        mediaDetailFilename.textContent = fi.name;
        mediaDetailTitle.value = fi.title
        mediaDetailTaken.value = fi.takenDateTime
        mediaDetailCategoryTags.value = fi.categoryTags
        mediaDetailMenuTags.value = fi.menuTags
        mediaDetailAlbumTags.value = fi.albumTags
        mediaDetailPeopleList.value = fi.people
        mediaPeopleList.value = fi.people
        mediaDetailDescription.value = fi.description

        // Set only the selected file in the thumbnail list
        /*
        for (let index2 in mediaInfo.fileList) {
            if (index2 == index) {
                mediaInfo.fileList[index2].Selected = true
            } else {
                mediaInfo.fileList[index2].Selected = false
            }
        }
        */    

        // Adjust the Category and Menu select options to match the current file
        for (let i = 0; i < mediaCategorySelect.options.length; i++) {
            if (mediaCategorySelect.options[i].value === fi.categoryTags) {
                mediaCategorySelect.options[i].selected = true
            } else {
                mediaCategorySelect.options[i].selected = false
            }
        }
 
        // set menuFilter array based on selected CategoryName
        setMenuFilter(mediaCategorySelect.value)
        // Clear the menu options and re-load from current menuFilter
        mediaMenuSelect.options.length = 0
        for (let index in menuFilter) {
            mediaMenuSelect.options[mediaMenuSelect.options.length] = new Option(menuFilter[index], menuFilter[index])
        }

        // Set the selected menu value according to the menuTags on the selected file
        for (let i = 0; i < mediaMenuSelect.options.length; i++) {
            if (mediaMenuSelect.options[i].value === fi.menuTags) {
                mediaMenuSelect.options[i].selected = true
            } else {
                mediaMenuSelect.options[i].selected = false
            }
        }

        // Re-display the file list to show the correct selected image
        displayCurrFileList()

        // Set the img src to get the smaller version of the image and display it on the screen
        mediaDetailImg.src = getFilePath(index,"Smaller")
    }

