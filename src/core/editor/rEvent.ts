import { Plugin as Plug } from "prosemirror-state"

export const rEvent = () => {
    return new Plug({
        view(view){
            return {
                update: (view, prevState) => {
                    let state = view.state;
                    if(prevState && prevState.doc.eq(state.doc) && prevState.selection.eq(state.selection)) return;
                    
                }
            }
        }
    })
}