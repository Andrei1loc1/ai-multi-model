import { AIModel, AIModels, ProviderFilter } from "../AImodels/models";

const modelCache = new Map<string, AIModel>();

export function getModelById(preferredModel: string, preferredProvider: ProviderFilter = "all"): AIModel | null {
    return (
        AIModels.find(
            (m) =>
                m.id === preferredModel &&
                m.active &&
                (preferredProvider === "all" || m.provider === preferredProvider) &&
                typeof m.apiKey === "string" &&
                m.apiKey.length > 0
        ) || null
    );
}

export function getModel(preferredModel?: string, preferredProvider: ProviderFilter = "all"): AIModel {
    const cacheKey = `${preferredProvider}:${preferredModel || "default"}`;
    if (modelCache.has(cacheKey)) {
        return modelCache.get(cacheKey)!;
    }

    let model: AIModel | undefined;
    if (preferredModel) {
        model = getModelById(preferredModel, preferredProvider) || undefined;
    }
    if (!model) {
        model = AIModels.find(
            (m) =>
                m.active &&
                (preferredProvider === "all" || m.provider === preferredProvider) &&
                typeof m.apiKey === "string" &&
                m.apiKey.length > 0
        );
    }
    if (!model) throw new Error(`No active models available for provider ${preferredProvider}.`);

    modelCache.set(cacheKey, model);
    return model;
}
