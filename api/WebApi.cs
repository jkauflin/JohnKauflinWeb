/*==============================================================================
(C) Copyright 2024 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Azure Function for SWA 
--------------------------------------------------------------------------------
Modification History
2024-06-30 JJK  Initial version (moving logic from PHP to here to update data
                in MediaInfo entities in Cosmos DB NoSQL
2024-07-28 JJK  Resolved JSON parse and DEBUG issues and got the update working
================================================================================*/
using System;
using System.IO;
using System.Threading.Tasks;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Azure.Cosmos;
using Newtonsoft.Json;

using JohnKauflinWeb.Function.Model;

namespace JohnKauflinWeb.Function
{
    public static class WebApi
    {
        [FunctionName("UpdateMediaInfo")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            [CosmosDB(Connection = "API_COSMOS_DB_CONN_STR")] CosmosClient cosmosClient,
            ILogger log,
            ClaimsPrincipal claimsPrincipal)
        {
            //log.LogInformation("UpdateMediaInfo, C# HTTP trigger function processed a request.");
            bool userAuthorized = false;
            if (req.Host.ToString().Equals("localhost:4280")) {
                // If local DEV look for Admin
                foreach (Claim claim in claimsPrincipal.Claims)
                {
                    //log.LogInformation("CLAIM TYPE: " + claim.Type + "; CLAIM VALUE: " + claim.Value + "</br>");
                    if (claim.Value.Equals("Admin")) {
                        userAuthorized = true;
                    }
                }
            } else {
                // In PROD, make sure user is in correct role to make updates
                userAuthorized = claimsPrincipal.IsInRole("jjkadmin");
            }

            if (!userAuthorized) {
                return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
            }

            //log.LogInformation(">>> User is authorized ");

            //------------------------------------------------------------------------------------------------------------------
            // Parse the JSON payload content from the Request BODY into a C# object, and process the MediaInfo array to
            // find records to update
            //------------------------------------------------------------------------------------------------------------------
            string responseMessage = "";

            try {
                var content = await new StreamReader(req.Body).ReadToEndAsync();
                var updParamData = JsonConvert.DeserializeObject<UpdateParamData>(content);
                string databaseId = "JJKWebDB";
                string containerId = "MediaInfo";
                Database db = cosmosClient.GetDatabase(databaseId);
                Container container = db.GetContainer(containerId);
                int updCnt = 0;
                int tempIndex = -1;
                foreach (Item item in updParamData.MediaInfoFileList) 
                {
                    tempIndex++;
                    if (updParamData.FileListIndex >= 0) {
                        if (tempIndex != updParamData.FileListIndex) {
                            continue;
                        }
                    } else {
                        if (!item.Selected) {
                            continue;
                        }
                    }

                    // Get the existing document from Cosmos DB
                    var queryText = $"SELECT * FROM c WHERE c.id = \"{item.id}\" ";
                    var feed = container.GetItemQueryIterator<MediaInfo>(queryText);
                    while (feed.HasMoreResults)
                    {
                        var response = await feed.ReadNextAsync();
                        foreach (var mediaInfo in response)
                        {
                            //log.LogInformation($"Found item id: {mediaInfo.id}  Name: {mediaInfo.Name}");

                            mediaInfo.TakenDateTime = DateTime.Parse(item.TakenDateTime);
                            mediaInfo.TakenFileTime = int.Parse(mediaInfo.TakenDateTime.ToString("yyyyMMddHH"));
                            mediaInfo.CategoryTags = item.CategoryTags;
                            mediaInfo.MenuTags = item.MenuTags;
                            mediaInfo.AlbumTags = item.AlbumTags;
                            mediaInfo.Title = item.Title;
                            mediaInfo.Description = item.Description;
                            mediaInfo.People = item.People;
                            mediaInfo.SearchStr = mediaInfo.CategoryTags.ToLower() + " " +
                                    mediaInfo.MenuTags.ToLower() + " " +
                                    mediaInfo.Title.ToLower() + " " +
                                    mediaInfo.Description.ToLower() + " " +
                                    mediaInfo.People.ToLower();
                            await container.UpsertItemAsync(mediaInfo,new PartitionKey(mediaInfo.MediaTypeId));
                            updCnt++;
                        }
                    }
                }

                responseMessage = $"Number of records saved = {updCnt}";
            }
            catch (Exception ex) {
                responseMessage = $"Exception in update, message = {ex.Message}";
            }

            return new OkObjectResult(responseMessage);
        }
    }
}
