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
using System.Net.Http;
using System.Web.Http;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace JohnKauflinWeb.Function
{
    public static class UpdateMediaInfo
    {
        [FunctionName("UpdateMediaInfo")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            ILogger log,
            ClaimsPrincipal claimsPrincipal)
        {
            log.LogInformation("UpdateMediaInfo, C# HTTP trigger function processed a request.");
            
            bool userAuthorized = false;
            if (req.Host.ToString().Equals("localhost:4280")) {
                foreach (Claim claim in claimsPrincipal.Claims)
                {
                    //log.LogInformation("CLAIM TYPE: " + claim.Type + "; CLAIM VALUE: " + claim.Value + "</br>");
                    if (claim.Value.Equals("Admin")) {
                        userAuthorized = true;
                    }
                }
            } else {
                userAuthorized = claimsPrincipal.IsInRole("jjkadmin");
            }

            if (!userAuthorized) {
                return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
            }


            string name = req.Query["name"];

            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            dynamic data = JsonConvert.DeserializeObject(requestBody);
            name = name ?? data?.name;

            string responseMessage = string.IsNullOrEmpty(name)
                ? $"*** This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response."
                : $"Hello, {name}. This HTTP triggered function executed successfully.";

            return new OkObjectResult(responseMessage);
        }
    }
}
