/*==============================================================================
 * (C) Copyright 2015,2023 John J Kauflin, All rights reserved. 
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
 *    swa start ./src --data-api-location swa-db-connections
 * 2024-03-17 JJK   
 *============================================================================*/

// Keep track of the state of the navbar collapse (shown or hidden)
var navbarCollapseShown = false;
var collapsibleNavbar = document.getElementsByClassName("navbar-collapse")[0];
collapsibleNavbar.addEventListener('hidden.bs.collapse', function () {
    navbarCollapseShown = false;
})
collapsibleNavbar.addEventListener('shown.bs.collapse', function () {
    navbarCollapseShown = true;
})
 
// Listen for nav-link clicks
document.querySelectorAll("a.nav-link").forEach(el => el.addEventListener("click", function (event) {
    // Automatically hide the navbar collapse when an item link is clicked (and the collapse is currently shown)
    if (navbarCollapseShown) {
        new bootstrap.Collapse(document.getElementsByClassName("navbar-collapse")[0]).hide()
    }
}))
 
/*
document.getElementById("list").addEventListener("click", list);
document.getElementById("get").addEventListener("click", get);
document.getElementById("update").addEventListener("click", update);
document.getElementById("create").addEventListener("click", create);
document.getElementById("delete").addEventListener("click", del);
*/

// Clear the parameters from the url
//window.history.replaceState({}, document.title, "/home/");

/*
async function list() {

    const query = `
        {
          people {
            items {
              id
              Name
            }
          }
        }`;
        
    const endpoint = "/data-api/graphql";
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query })
    });
    const result = await response.json();
    console.table(result.data.people.items);
}

async function get() {

    const id = '1';
  
    const gql = `
      query getById($id: ID!) {
        person_by_pk(id: $id) {
          id
          Name
        }
      }`;
  
    const query = {
      query: gql,
      variables: {
        id: id,
      },
    };
  
    const endpoint = "/data-api/graphql";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });
    const result = await response.json();
    console.table(result.data.person_by_pk);
  }

  async function update() {

    const id = '1';
    const data = {
      id: id,
      Name: "Molly"
    };
  
    const gql = `
      mutation update($id: ID!, $_partitionKeyValue: String!, $item: UpdatePersonInput!) {
        updatePerson(id: $id, _partitionKeyValue: $_partitionKeyValue, item: $item) {
          id
          Name
        }
      }`;
  
    const query = {
      query: gql,
      variables: {
        id: id,
        _partitionKeyValue: id,
        item: data
      } 
    };
  
    const endpoint = "/data-api/graphql";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query)
    });
  
    const result = await res.json();
    console.table(result.data.updatePerson);
  }

  async function create() {

    const data = {
      id: "3",
      Name: "Pedro"
    };
  
    const gql = `
      mutation create($item: CreatePersonInput!) {
        createPerson(item: $item) {
          id
          Name
        }
      }`;
    
    const query = {
      query: gql,
      variables: {
        item: data
      } 
    };
    
    const endpoint = "/data-api/graphql";
    const result = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query)
    });
  
    const response = await result.json();
    console.table(response.data.createPerson);
  }

  async function del() {

    const id = '3';
  
    const gql = `
      mutation del($id: ID!, $_partitionKeyValue: String!) {
        deletePerson(id: $id, _partitionKeyValue: $_partitionKeyValue) {
          id
        }
      }`;
  
    const query = {
      query: gql,
      variables: {
        id: id,
      _partitionKeyValue: id
      }
    };
  
    const endpoint = "/data-api/graphql";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query)
    });
  
    const result = await response.json();
    console.log(`Record deleted: ${ JSON.stringify(result.data) }`);
  }
*/
  


