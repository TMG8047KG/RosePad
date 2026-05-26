use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectStructure {
    pub id: String,            //Indentify
    pub name: String,          //File name
    pub path: String,          //File Path
    pub ext: Option<String>,   //File extension, becаuse... file rasicm
    pub title: Option<String>, //UI name of the file (aka file name: "gosho_pedala" = UI name = "gosho pedala")
    pub last_modified_ms: i64,
    //TODO: Find out why the AI added this shit
    pub size: i64,                     //Can't seem to remember why we have you
    pub parent_folder: Option<String>, //Is project in a folder or not (root doesn't count)
}
