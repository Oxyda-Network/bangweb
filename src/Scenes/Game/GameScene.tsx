import { createContext, useContext, useEffect, useRef } from "react";
import useMapRef from "../../Utils/UseMapRef";
import { getDivRect } from "../../Utils/Rect";
import { LobbyContext, getUser } from "../Lobby/Lobby";
import AnimationView from "./Animations/AnimationView";
import CardChoiceView from "./CardChoiceView";
import { SPRITE_CUBE } from "./CardView";
import GameLogView from "./GameLogView";
import { PocketType } from "./Model/CardEnums";
import { CardTracker, PocketPosition, PocketPositionMap } from "./Model/CardTracker";
import { Card, Player, PocketRef, getPlayer, newGameTable } from "./Model/GameTable";
import { PlayerId } from "./Model/GameUpdate";
import { TargetSelector, newTargetSelector, selectorCanConfirm, selectorCanUndo } from "./Model/TargetSelector";
import { handleClickCard, handleClickPlayer, handleSendGameAction } from "./Model/TargetSelectorManager";
import { GameChannel, useGameState } from "./Model/UseGameState";
import PlayerView from "./PlayerView";
import PocketView from "./Pockets/PocketView";
import StackPocket from "./Pockets/StackPocket";
import StationsView from "./Pockets/StationsView";
import TrainView from "./Pockets/TrainView";
import PromptView from "./PromptView";
import StatusBar from "./StatusBar";
import "./Style/GameScene.css";
import "./Style/PlayerGridDesktop.css";
import "./Style/PlayerGridMobile.css";

export interface GameProps {
  channel: GameChannel;
  handleReturnLobby: () => void;
}

const EMPTY_TABLE = newGameTable();
export const GameTableContext = createContext(EMPTY_TABLE);

export default function GameScene({ channel, handleReturnLobby }: GameProps) {
  const { myUserId, users } = useContext(LobbyContext);
  const { table, selectorDispatch, gameLogs, gameError, clearGameError } = useGameState(channel, myUserId);

  const pocketPositions = useMapRef<PocketType, PocketPosition>();
  const playerPositions = useMapRef<PlayerId, PocketPositionMap>();
  const cubesRef = useRef<HTMLDivElement>(null);

  const isGameOver = table.status.flags.includes('game_over');

  const setPos = (pocket: PocketType) => {
    return (value: PocketPosition | null) => {
      pocketPositions.set(pocket, value);
    };
  };
  
  const tracker: CardTracker = {
    getPlayerPockets(player: PlayerId) {
      return playerPositions.get(player);
    },

    getTablePocket(pocket: PocketRef) {
      if (!pocket) {
        return null;
      } else if ('player' in pocket) {
        return this.getPlayerPockets(pocket.player)?.get(pocket.name) ?? null;
      } else {
        return pocketPositions.get(pocket.name);
      }
    },
    
    getCubesRect(card: Card | null) {
      if (card) {
        return this.getTablePocket(card.pocket)?.getCardRect(card.id) ?? null;
      } else {
        return cubesRef.current ? getDivRect(cubesRef.current) : null;
      }
    }
  };

  const clickIsAllowed = !isGameOver
      && table.self_player !== undefined
      && table.selector.selection.mode != 'finish'
      && table.selector.prompt.type == 'none';

  const onClickCard = clickIsAllowed ? (card: Card) => handleClickCard(table, selectorDispatch, card) : undefined;
  const onClickPlayer = clickIsAllowed ? (player: Player) => handleClickPlayer(table, selectorDispatch, player) : undefined;
  
  const handleConfirm = (clickIsAllowed && selectorCanConfirm(table)) ? () => selectorDispatch({ confirmPlay: {} }) : undefined;
  const handleUndo = (clickIsAllowed && selectorCanUndo(table)) ? () => selectorDispatch({ undoSelection: {} }) : undefined;
  
  useEffect(() => handleSendGameAction(table, channel), [table.selector]);

  const shopPockets = (table.pockets.shop_deck.length != 0 || table.pockets.shop_selection.length != 0) && (
    <div className="pocket-group relative">
      <div className="absolute">
        <StackPocket ref={setPos('shop_discard')} cards={table.pockets.shop_discard} />
      </div>
      <StackPocket showCount ref={setPos('shop_deck')} cards={table.pockets.shop_deck} />
      <PocketView ref={setPos('shop_selection')} cards={table.pockets.shop_selection.slice(0).reverse()} onClickCard={onClickCard} />
    </div>
  );

  const trainPockets = (table.pockets.stations.length !== 0 || table.pockets.train_deck.length !== 0) && (
    <div className="train-row">
      <div className="train-row-inner">
        <StackPocket showCount ref={setPos('train_deck')} cards={table.pockets.train_deck} />
        <div className="train-stations-container">
          <StationsView cards={table.pockets.stations} onClickCard={onClickCard} />
          <TrainView ref={setPos('train')} onClickCard={onClickCard} />
        </div>
      </div>
    </div>
  );

  const tableCubes = <div className='table-cubes' ref={cubesRef}>
    { table.status.num_cubes > 0 && <>
      <img src={SPRITE_CUBE} />
      <div>x{table.status.num_cubes}</div>
    </> }
  </div>;

  const mainDeck = (table.pockets.discard_pile.length !== 0 || table.pockets.main_deck.length !== 0 || table.animation) &&
    <div className="pocket-group">
      <StackPocket slice={10} ref={setPos('discard_pile')} cards={table.pockets.discard_pile} onClickCard={onClickCard} />
      <StackPocket showCount ref={setPos('main_deck')} cards={table.pockets.main_deck} onClickCard={onClickCard} />
    </div>;

  const scenarioCards = 
    (table.pockets.scenario_deck.length !== 0 || table.pockets.scenario_card.length !== 0
    || table.pockets.wws_scenario_deck.length !== 0 || table.pockets.wws_scenario_card.length !== 0)
      && <div className="pocket-group">
        {(table.pockets.scenario_deck.length !== 0 || table.pockets.scenario_card.length !== 0) && <>
          <div className="inline-block card-faded"><StackPocket ref={setPos('scenario_deck')} cards={table.pockets.scenario_deck} slice={2} showCount /></div>
          <StackPocket ref={setPos('scenario_card')} cards={table.pockets.scenario_card} slice={2} onClickCard={onClickCard} />
        </>}
        {(table.pockets.wws_scenario_deck.length !== 0 || table.pockets.wws_scenario_card.length !== 0) && <>
          <StackPocket ref={setPos('wws_scenario_deck')} cards={table.pockets.wws_scenario_deck} slice={2} showCount />
          <StackPocket ref={setPos('wws_scenario_card')} cards={table.pockets.wws_scenario_card} slice={2} onClickCard={onClickCard} />
        </>}
    </div>;

  const selectionPocket = table.pockets.selection.length != 0 && (
    <div className="selection-view whitespace-nowrap">
      <PocketView ref={setPos('selection')} cards={table.pockets.selection} onClickCard={onClickCard} />
    </div>
  );

  const playerViews = table.alive_players.map((player_id, index) => {
    const player = getPlayer(table, player_id);
    const user = getUser(users, player.userid);

    return <div key={player_id} className="player-grid-item" player-index={index}>
      <PlayerView ref={value => playerPositions.set(player_id, value)} user={user} player={player}
        onClickPlayer={onClickPlayer}
        onClickCard={onClickCard}
      />
    </div>;
  });

  return (
    <GameTableContext.Provider value={table}>
      <div className="game-scene">
        <div className="main-deck-row">
          <div>
            { shopPockets }{ tableCubes }{ mainDeck }{ scenarioCards }
          </div>
          { trainPockets }
        </div>
        <div className="player-grid" num-players={table.alive_players.length}>
          { playerViews }
        </div>
        { selectionPocket }
        <PromptView prompt={table.selector.prompt} selectorDispatch={selectorDispatch} />
        <CardChoiceView tracker={tracker} onClickCard={onClickCard}/>
        <AnimationView tracker={tracker} />
        <GameLogView logs={gameLogs} />
        <StatusBar
          gameError={gameError}
          handleClearGameError={clearGameError}
          handleReturnLobby={handleReturnLobby}
          handleConfirm={handleConfirm}
          handleUndo={handleUndo}
          onClickCard={onClickCard}
        />
      </div>
    </GameTableContext.Provider>
  );
}