import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { appConfigDir } from '@tauri-apps/api/path';

export async function saveJsonToFile(data: any, fileName: string) {
    try {
      // Convert object to JSON string
      const jsonString = JSON.stringify(data, null, 2);
  
      // Get the app's config directory path
      const path = await join(await appConfigDir(), fileName);
  
      // Write the JSON string to the file
      await writeTextFile(path, jsonString);
  
      console.log('File saved successfully!');
    } catch (error) {
      console.error('Error saving JSON file:', error);
    }
}

export async function readJsonFromFile(fileName: string) {
    try {
      // Get the app's config directory path
      const path = await join(await appConfigDir(), fileName);
  
      // Read the file contents
      const fileContents = await readTextFile(path);
  
      // Parse the JSON string back into an object
      const data = JSON.parse(fileContents);
  
      console.log('File read successfully:', data);
      return data;
    } catch (error) {
      console.error('Error reading JSON file:', error);
    }
}