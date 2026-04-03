export async function saveChatResponse(response: string, title: string) {
    const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, response }),
    });

    if (!res.ok) {
        throw new Error("Failed to save note.");
    }

    const data = await res.json();
    return data.note;
}

export async function updateChatResponse(id: string, response: string, title: string) {
    const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, response }),
    });

    if (!res.ok) {
        throw new Error("Failed to update note.");
    }

    const data = await res.json();
    return data.note;
}

export async function deleteChatResponse(id: string) {
    const res = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
    });

    if (!res.ok) {
        throw new Error("Failed to delete note.");
    }
}
