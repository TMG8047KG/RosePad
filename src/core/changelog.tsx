// https://api.github.com/repos/TMG8047KG/RosePad/releases/tags/v1.0.0-beta-6

import { getVersion } from "@tauri-apps/api/app";
import { JSX } from "react";

export async function getChangeLog(){
    const tagData = await getTagJson()
    console.log(tagData)
    return tagData;
}

export default async function formattedChangeLog(): Promise<JSX.Element> {
    const jsonTagData = await getChangeLog()
    let tagBody = jsonTagData.body as string;
    tagBody = tagBody.replace(/^## [^\n]+\n?/, "");
    tagBody = tagBody.replace(/##### (.+)/g, "<h5>$1</h5>");
    tagBody = tagBody.replace(/#### (.+)/g, "<h4>$1</h4>");
    tagBody = tagBody.replace(/### (.+)/g, "<h3>$1</h3>");
    const listifiedBody: string[] = [];
    let currentDepth = 0; // number of open <ul>

    for (const line of tagBody.split(/\n/)) {
        const listItemMatch = line.match(/^(\s*)[-*]\s+(.*)/);
        if (listItemMatch) {
            const leadingWhitespace = listItemMatch[1].replace(/\t/g, "    ").length;
            const desiredDepth = Math.floor(leadingWhitespace / 2) + 1; // 0-1 spaces => depth 1, 2-3 => depth 2, etc.

            while (currentDepth < desiredDepth) {
                listifiedBody.push("<ul>");
                currentDepth++;
            }
            while (currentDepth > desiredDepth) {
                listifiedBody.push("</ul>");
                currentDepth--;
            }

            listifiedBody.push(`<li>${listItemMatch[2]}</li>`);
            continue;
        }

        while (currentDepth > 0) {
            listifiedBody.push("</ul>");
            currentDepth--;
        }

        listifiedBody.push(line);
    }

    while (currentDepth > 0) {
        listifiedBody.push("</ul>");
        currentDepth--;
    }

    tagBody = listifiedBody.join("\n");
    
    return (
        <div dangerouslySetInnerHTML={{ __html: tagBody }} />
    )
}

async function getTagJson() {
    const version = await getVersion();
    console.log(version);
    
    const rawTagData = await fetch(`https://api.github.com/repos/TMG8047KG/RosePad/releases/tags/v${version}`,
        {
            headers: {
                "Accept": "application/vnd.github+json"
            }
        }
    );

    if(!rawTagData.ok){
        throw new Error(
            `GitHub API error ${rawTagData.status}: ${rawTagData.text()}`
        );
    }

    const rawTagDataText = await rawTagData.text()

    return JSON.parse(rawTagDataText);
}
