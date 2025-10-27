
using System;
using Newtonsoft.Json;

namespace JohnKauflinWeb.Function.Model
{
    public class MediaInfoAll
    {
        public List<MediaInfo>? fileList { get; set; }
        public List<MediaAlbum>? albumList { get; set; }
        //public List<MediaInfo>? menuList { get; set; }
        //public List<MediaInfo>? filterList { get; set; }

/*
export let mediaInfo = {
    fileList: [],
    menuList: [],
    filterList: [],
    startDate: "",
    menuOrAlbumName: ""}
*/
        public string startDate { get; set; }
        public string menuOrAlbumName { get; set; }

        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }

}
