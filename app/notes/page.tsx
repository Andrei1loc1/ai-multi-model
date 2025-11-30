"use client"

import React, { useState, useEffect } from 'react'
import { File, Search } from "lucide-react";
import { getDatabase, onValue, ref } from "firebase/database";
import { db } from "@/app/lib/database/firebase"
import Note from "@/app/components/notes/Note";
import AddNote from "@/app/components/notes/AddNote";

const Page = () => {
    const [respons, setRespons] = useState<Array<{id: string, title: string, response: string}>>([]);

    useEffect(() => {
        const responsesRef = ref(db, 'responses');
        const unsubscribe = onValue(responsesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const responses: Array<{id: string, title: string, response: string}> = Object.entries(data).map(([key, item]: [string, any]) => ({
                    id: key,
                    title: item.title || 'Untitled',
                    response: item.response
                }));
                setRespons(responses);
            }
        });
        return () => {
            unsubscribe();
        };
    }, []);

    return (
        <div className="min-h-screen p-2 sm:p-4 flex flex-col items-center pt-6 sm:pt-10 bg-gray-900 bg-[linear-gradient(135deg,#0f0f23_0%,#1e293b_20%,#312e81_40%,#1e1b4b_60%,#0f172a_80%,#1e293b_100%)]">
            <div className="flex flex-row w-full max-w-full sm:max-w-4xl bg-white/3 p-4 sm:p-6 rounded-lg shadow-2xl items-center justify-start">
                <Search className="text-xl sm:text-2xl text-purple-300 mr-2 sm:mr-3" />
                <h1 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-purple-200 via-blue-200 to-blue-200 bg-clip-text text-transparent drop-shadow-lg">
                    .MD <span className="font-mono">NOTES</span>
                </h1>
            </div>
            <div className="flex flex-col p-3 sm:p-5 w-full max-w-full sm:max-w-6xl bg-white/3 mt-6 sm:mt-10 rounded-lg shadow-2xl">
                <div className="flex flex-row w-full max-w-full sm:max-w-4xl rounded-lg items-center justify-start">
                    <h1 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-purple-200 via-blue-200 to-blue-200 bg-clip-text text-transparent drop-shadow-lg">
                        <span className="font-mono">Here are your notes</span>
                    </h1>
                    <File className="text-xl sm:text-2xl text-purple-300 ml-2 sm:ml-3" />
                </div>
                <div className="w-full grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3 sm:gap-4 mt-4 sm:mt-5 place-items-center">
                    <AddNote />
                     {
                          respons.slice().reverse().map((note: {id: string, title: string, response: string}) => (
                              <Note key={note.id} id={note.id} title={note.title} respon={note.response} />
                          ))
                      }
                </div>
            </div>
        </div>
    )
}
export default Page
