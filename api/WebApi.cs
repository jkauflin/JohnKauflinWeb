/*==============================================================================
(C) Copyright 2024 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Azure Function for SWA 
--------------------------------------------------------------------------------
Modification History
2024-06-30 JJK  Initial version (moving logic from PHP to here to update data
                in MediaInfo entities in Cosmos DB NoSQL
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
//using Microsoft.Azure.Functions.Worker.Extensions.CosmosDB;

using Newtonsoft.Json;

using JohnKauflinWeb.Function.Model;

/*
                databaseName: "JJKWebDB",
                containerName: "MediaInfo",
*/

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
            log.LogInformation("UpdateMediaInfo, C# HTTP trigger function processed a request.");
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


            var content = await new StreamReader(req.Body).ReadToEndAsync();

            var updParamData = JsonConvert.DeserializeObject<UpdateParamData>(content);

            string name = updParamData.MediaInfoFileList[0].Name;

            //string name = req.Query["name"];

            //updParamData.MediaFilterMediaType
            //updParamData.FileListIndex

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
                        log.LogInformation($"Found item: {mediaInfo.Name}");
                        //idStr = item.id;
                    }
                }

                // Update the fields in the document

            }

/*
		$sql = "UPDATE FileInfo SET CategoryTags=?,MenuTags=?,AlbumTags=?,TakenDateTime=?,Title=?,Description=?,People=?,ToBeProcessed=0 WHERE Name=? ";
		$stmt = $conn->prepare($sql);
		foreach ($param->mediaInfoFileList as $fi) {
			$tempIndex++;
			if ($param->index >= 0) {
				if ($tempIndex != $param->index) {
					continue;
				}
			} else {
				if (!$fi->Selected) {
					continue;
				}
			}
	
			$stmt->bind_param("ssssssss",$fi->CategoryTags,$fi->MenuTags,$fi->AlbumTags,$fi->TakenDateTime,$fi->Title,$fi->Description,$fi->People,$fi->Name);
			$stmt->execute();
			$updCnt++;
		}
		$stmt->close();
	}

	$conn->close();
	$returnMsg = "Number of records saved = " . $updCnt;

*/

/*
    // TakenFileTime and SearchStr are derived

                MediaInfo mediaInfo = new MediaInfo
                {
                    id = idStr,
                    MediaTypeId = mediaTypeId,
                    Name = storageFilename,
                    TakenDateTime = takenDT,
                    //TakenFileTime = takenDT.ToFileTime(),
                    TakenFileTime = int.Parse(takenDT.ToString("yyyyMMddHH")),
                    CategoryTags = band,
                    MenuTags = album,
                    AlbumTags = "",
                    Title = fi.Name,
                    Description = "",
                    People = "",
                    ToBeProcessed = false,
                    SearchStr = storageFilename
                };
*/


/*
		$sql = "UPDATE FileInfo SET CategoryTags=?,MenuTags=?,AlbumTags=?,TakenDateTime=?,Title=?,Description=?,People=?,ToBeProcessed=0 WHERE Name=? ";
		$stmt = $conn->prepare($sql);
		foreach ($param->mediaInfoFileList as $fi) {
			$tempIndex++;
			if ($param->index >= 0) {
				if ($tempIndex != $param->index) {
					continue;
				}
			} else {
				if (!$fi->Selected) {
					continue;
				}
			}
	
			$stmt->bind_param("ssssssss",$fi->CategoryTags,$fi->MenuTags,$fi->AlbumTags,$fi->TakenDateTime,$fi->Title,$fi->Description,$fi->People,$fi->Name);
			$stmt->execute();
			$updCnt++;
		}
		$stmt->close();
	}

	$conn->close();
	$returnMsg = "Number of records saved = " . $updCnt;

*/
            string responseMessage = $"Update successful";
            return new OkObjectResult(responseMessage);
        }
    }
}
