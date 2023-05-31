import { ExpansionType } from "../../Messages/CardEnums";
import { GameOptions } from "../../Messages/GameUpdate";
import { ChangeEvent, Dispatch, SetStateAction } from "react";
import { getLocalizedLabel } from "../../Locale/Locale";

export interface GameOptionProps {
    gameOptions: GameOptions;
    setGameOptions: Dispatch<SetStateAction<GameOptions>>;
}

type FilteredKeys<T, U> = { [P in keyof T]: T[P] extends U ? P : never }[keyof T];
type GameOptionsOf<T> = { [Property in FilteredKeys<GameOptions, T>]: GameOptions[Property] };

export default function GameOptionsEditor({ gameOptions, setGameOptions }: GameOptionProps) {
    const newExpansionCheckbox = (name: ExpansionType) => {
        const handleExpansionChange = (event: ChangeEvent<HTMLInputElement>) => {
            const oldValue = gameOptions.expansions.includes(name);
            const newValue = event.target.checked;
            if (oldValue != newValue) {
                setGameOptions({
                    ... gameOptions,
                    expansions: newValue
                        ? gameOptions.expansions.concat(name)
                        : gameOptions.expansions.filter(e => e != name)
                });
            }
        };

        return (<>
            <input id={name} type="checkbox" checked={gameOptions.expansions.includes(name)} onChange={handleExpansionChange} />
            <label htmlFor={name}>{getLocalizedLabel('ExpansionType', name)}</label>
        </>);
    };

    const newOptionCheckbox = function(prop: keyof GameOptionsOf<boolean>) {
        return (<>
            <input id={prop} type="checkbox" checked={gameOptions[prop]}
            onChange={event => {
                setGameOptions({
                    ... gameOptions,
                    [prop]: event.target.checked
                });
            }} />
            <label htmlFor={prop}>{getLocalizedLabel('GameOptions', prop)}</label>
        </>)
    };

    const newOptionNumber = function(prop: keyof GameOptionsOf<number>) {
        return (<>
            <label htmlFor={prop}>{getLocalizedLabel('GameOptions', prop)}</label>
            <input id={prop} type="number" value={gameOptions[prop]}
            onChange={event => {
                if (!isNaN(event.target.valueAsNumber)) {
                    setGameOptions({
                        ... gameOptions,
                        [prop]: event.target.valueAsNumber
                    });
                }
            }} />
        </>);
    };

    return (
        <ul>
            <li>{newExpansionCheckbox('dodgecity')}</li>
            <li>{newExpansionCheckbox('goldrush')}</li>
            <li>{newExpansionCheckbox('armedanddangerous')}</li>
            <li>{newExpansionCheckbox('greattrainrobbery')}</li>
            <li>{newExpansionCheckbox('valleyofshadows')}</li>
            <li>{newExpansionCheckbox('highnoon')}</li>
            <li>{newExpansionCheckbox('fistfulofcards')}</li>
            <li>{newExpansionCheckbox('wildwestshow')}</li>
            <li>{newExpansionCheckbox('thebullet')}</li>
            <li>{newOptionCheckbox('enable_ghost_cards')}</li>
            <li>{newOptionCheckbox('character_choice')}</li>
            <li>{newOptionCheckbox('allow_beer_in_duel')}</li>
            <li>{newOptionCheckbox('quick_discard_all')}</li>
            <li>{newOptionNumber('scenario_deck_size')}</li>
            <li>{newOptionNumber('num_bots')}</li>
            <li>{newOptionNumber('damage_timer')}</li>
            <li>{newOptionNumber('escape_timer')}</li>
            <li>{newOptionNumber('bot_play_timer')}</li>
            <li>{newOptionNumber('tumbleweed_timer')}</li>
        </ul>
    );
}