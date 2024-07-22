
using System;
using Newtonsoft.Json;

namespace JohnKauflinWeb.Function.Model
{
    public class UpdateParamData
    {
        public int MediaFilterMediaType { get; set; }              

        public Item[] MediaInfoFileList { get; set; } 

        public int FileListIndex { get; set; }   

        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }

    public class Item
    {
        public string id { get; set; }                      // make it a GUID (not Name)
        public string Name { get; set; }                    // name of the file
        public string TakenDateTime { get; set; }         
        public string CategoryTags { get; set; }
        public string MenuTags { get; set; }
        public string AlbumTags { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string People { get; set; }              
        public bool ToBeProcessed { get; set; }
        public bool Selected { get; set; }

        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }

    }
}
