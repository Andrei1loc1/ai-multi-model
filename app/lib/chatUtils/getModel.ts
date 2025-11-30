import { AIModel, AIModels } from "../AImodels/models";

const modelCache = new Map<string, AIModel>();

export function getModel(preferredModel? :string): AIModel{
    const cacheKey = preferredModel || "default";
    if (modelCache.has(cacheKey)) {
        return modelCache.get(cacheKey)!;
    }

    let model: AIModel | undefined;
    if(preferredModel){
        model = AIModels.find(m => m.id === preferredModel && m.active && typeof m.apiKey === "string" && m.apiKey.length > 0);
    }
    if (!model) {
        model = AIModels.find(m => m.active && typeof m.apiKey === "string" && m.apiKey.length > 0);
    }
    if(!model) throw new Error("No active models yet");

    modelCache.set(cacheKey, model);
    return model;
}
