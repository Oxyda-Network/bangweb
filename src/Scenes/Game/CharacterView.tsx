import { MutableRefObject, forwardRef, useImperativeHandle, useRef } from "react";
import { Player } from "./Model/GameTable";
import PocketView, { PocketPosition } from "./PocketView";

export interface CharacterProps {
    player: Player;
}

export interface CharacterRef {
    characterRef: MutableRefObject<PocketPosition | null>;
    backupRef: MutableRefObject<PocketPosition | null>;
}

const CharacterView = forwardRef<CharacterRef, CharacterProps>(({ player }, ref) => {
    const characterRef = {
        characterRef: useRef<PocketPosition>(null),
        backupRef: useRef<PocketPosition>(null)
    };

    useImperativeHandle(ref, () => characterRef);

    return (<div className='inline-block relative'>
        <div className="player-backup">
            <PocketView ref={characterRef.backupRef} cards={player.pockets.player_backup} />
            { player.status.hp > 5 ? 
                <div className="player-backup-extra">
                    <PocketView cards={player.pockets.player_backup.slice(-1)} />
                </div> : null }
        </div>
        <div className="min-one-card">
            <PocketView ref={characterRef.characterRef} cards={player.pockets.player_character} />
        </div>
        { player.status.gold > 0 ?
            <div className="player-gold">{player.status.gold}</div>
        : null }
    </div>)
});

export default CharacterView;