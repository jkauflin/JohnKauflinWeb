/*==============================================================================
 * (C) Copyright 2015,2023,2024 John J Kauflin, All rights reserved. 
 *----------------------------------------------------------------------------
 * DESCRIPTION: 
 *----------------------------------------------------------------------------
 * Modification History
 * 2015-03-06 JJK 	Initial version 
 * 2016-12-03 JJK	Converted from JQuery Mobile to Twitter Bootstrap
 * 2016-12-16 JJK	Working on getting the photo gallery right
 * 2017-03-25 JJK	Working on the menu and folder display to work with 
 * 					photos, audio, and video displays
 * 2017-04-01 JJK	No joke - I got the menus, thumbnails, and links working
 * 					with a function to handle all media types
 * 2017-04-02 JJK	Implementing webshims lib
 * 2017-04-03 JJK	Not implementing webshims lib until I need those polyfills
 * 					just using mediaelementjs for now
 * 2017-04-12 JJK	Giving up on webshims and mediaelementjs for now, just
 * 					using straight HTML5 audio object
 * 2017-04-15 JJK	Doing my own straight HTML5 audio playlist, but using the
 * 					webshims mediaelement
 * 2017-04-16 JJK	Got audio player and playlist in decent shape, working
 * 					on videos display
 * 2017-04-22 JJK	Videos display ok with default iframe for youtube
 * 					Adding headshot jumbo
 * 2017-05-07 JJK	Finishing up new Production version
 * 2017-10-08 JJK	Update to HTML5 boilerplate 6, bootstrap 3.3, jquery 3
 * 2018-10-07 JJK	Moving menus code to jjk-content-menus library
 * 2018-12-26 JJK	Update to HTML5 boilerplate 6.1
 * 2018-12-26 JJK   Re-factored for modules
 * 2020-12-12 JJK   Making updates for bootstrap 4
 * 2022-04-27 JJK	Making updates for bootstrap 5
 * 2022-06-02 JJK	Moving nav/tab stuff to navtab.js
 * 2023-01-27 JJK	Moving the "auto collapse" back here.  Updated for new
 * 					Bootstrap v5.2 tab logic (which handles the setting of
 * 					active tab better) - moved the auto collapse here and 
 * 					the link-tile-tab show to media gallery, and got rid of
 * 					the seperate navtab.js just to avoid confusion
 * 2023-07-23 JJK   Modified to conform to ES6 module standard
 * ---------------------------------------------------------------------------
 * 2024-03-10 JJK   Migrating to an Azure static web app (SWA)
 * 2024-04-26 JJK   moved the mediagallery code here for admin version
 * 2024-06-25 JJK   Trying to get back into Admin development to update
 *                  metadata on pictures.  
 * 2025-10-24 JJK   Converting data-api to api function calls (and update to
 *                  Bootstrap v5.3.8)
 *============================================================================*/
import {mediaType,setMediaType,queryMediaInfo} from './mg-data-repository.js'
import {} from './genv.js';

const MediaPageLinkClass = "media-page";
 
// Keep track of the state of the navbar collapse (shown or hidden)
var navbarCollapseShownAdmin = false;
document.addEventListener('DOMContentLoaded', () => {
    var collapsibleNavbar = document.getElementsByClassName("navbar-collapse")[0]
    collapsibleNavbar.addEventListener('hidden.bs.collapse', function () {
        navbarCollapseShown = false
    })
    collapsibleNavbar.addEventListener('shown.bs.collapse', function () {
        navbarCollapseShown = true
    })
    
    // Listen for nav-link clicks
    document.querySelectorAll("a.nav-link").forEach(el => el.addEventListener("click", function (event) {
        // Automatically hide the navbar collapse when an item link is clicked (and the collapse is currently shown)
        if (navbarCollapseShown) {
            new bootstrap.Collapse(document.getElementsByClassName("navbar-collapse")[0]).hide()
        }
    }))

    // Respond to click on a link-tile-tab button by finding the correct TAB and switching/showing it
    // (These link-tile-tab's also have media-page for creating the Menu, but these handled from the listener on that class)
    document.querySelectorAll(".link-tile-tab").forEach(el => el.addEventListener("click", function (event) {
        setMediaType(event.target.getAttribute('data-MediaType'))
        //console.log("link-tile-tab click, mediaType = " + mediaType)

        // Get the target tab based on the the MediaType specified, and use the new Bootstrap v5.2 js for showing the tab
        // the link ('a') with the correct MediaType, within the ".navbar-nav" list
        let targetTabElement = document.querySelector(`.navbar-nav a[data-MediaType="${mediaType}"]`);

        // If the target tab element is found, create a Tab object and call the show() method
        if (typeof targetTabElement !== "undefined" && targetTabElement !== null) {
            bootstrap.Tab.getOrCreateInstance(targetTabElement).show();
        }

    }));

    // Respond to click on a media-page link tab by dynamically building the menu display
    document.querySelectorAll("."+MediaPageLinkClass).forEach(el => el.addEventListener("click", function (event) {
        setMediaType(event.target.getAttribute('data-MediaType'))
        //console.log("media-page click, mediaType = " + mediaType)

        if (typeof mediaType !== "undefined" && mediaType !== null) {
            // >>>>>>>>>>>>>>>>>>>>>>>> this is the START of things <<<<<<<<<<<<<<<<<<<
            let paramData = {
                MediaFilterMediaType: mediaType, 
                getMenu: true,
                MediaFilterCategory: "DEFAULT",
                MediaFilterStartDate: "DEFAULT"}
    
            queryMediaInfo(paramData);
        }
    }));
})

