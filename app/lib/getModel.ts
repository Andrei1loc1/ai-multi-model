import { AIModel, AIModels } from "./models";

export function getModel(preferredModel? :string): AIModel{
    if(preferredModel){
        const found = AIModels.find(m => m.id === preferredModel && m.active && typeof m.apiKey === "string" && m.apiKey.length > 0);
        if(found){
            return found;
        }
    }
    const available = AIModels.find(m => m.active && typeof m.apiKey === "string" && m.apiKey.length > 0);
    if(!available) throw new Error("No active models yet");
    return available;
}
