import { useEffect, useRef } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { history } from "prosemirror-history";
import { keyBinding } from "./rKeymap";
import { rSchema } from "./rSchema";
import { rRules } from "./rRules";
import style from '../../styles/Editor.module.css'
import '../../styles/components/editor/mirror.css'

export default function EditorPanel(){
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if(!editorRef.current) return;

        const state = EditorState.create({
            schema: rSchema,
            plugins: [
                rRules(),
                keyBinding(),
                history({ depth: 100, newGroupDelay: 500 }),
            ]}
        )
        const view = new EditorView(editorRef.current, { state });

        return () => {
            view.destroy();
        };
    }, []);


    return(
        <div ref={editorRef} className={style.editor}/>
    );
}