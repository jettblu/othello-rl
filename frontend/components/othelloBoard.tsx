"use client";
import { Provider, useSelector, useDispatch } from "react-redux";
import { IGlobalState } from "@/store/reducers";
import OthelloPiece from "./othelloPiece";
import store from "@/store";
import { boardFromString, playAtPieceIndex } from "@/helpers/gameplay";
import { IBoardUpdate, IPlayer, PlayerType } from "@/types";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  resetGame,
  toggleTurn,
  toggle_PlayerA_Remote,
  toggle_PlayerB_Remote,
  toggle_playerA_Ai,
  toggle_playerB_Ai,
} from "@/store/actions";
import { requestNextMoveFromAi } from "@/helpers/requests";
import toast from "react-hot-toast";

interface IBoardParams {
  realtimeConfig?: IRealtimeConfig;
}

interface IRealtimeConfig {
  gameId: string;
}

interface IRealtimeMove {
  move_index: number;
  player: number;
}

export default function OthelloBoard(params: IBoardParams) {
  return (
    <Provider store={store}>
      <OthelloBoardInner realtimeConfig={params.realtimeConfig} />
    </Provider>
  );
}

function OthelloBoardInner(params: IBoardParams) {
  const board = useSelector((state: IGlobalState) => state.board);
  const gameConfig = useSelector((state: IGlobalState) => state.gameAttrs);
  const playerA = useSelector((state: IGlobalState) => state.playerA);
  const playerB = useSelector((state: IGlobalState) => state.playerB);
  const [secondsForLastAiMove, setSecondsForLastAiMove] = useState(0); // seconds since last ai move
  const [loadingAiMove, setLoadingAiMove] = useState(false);
  const [realtimeConfig, setRealtimeConfig] = useState<IRealtimeConfig | null>(
    params.realtimeConfig ? params.realtimeConfig : null
  );
  // state for web socket object
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [waitingForPlayer, setWaitingForPlayer] = useState<boolean>(false);
  const [mostRecentMessage, setMostRecentMessage] = useState<string>("");
  const dispatch = useDispatch();
  const pathName = usePathname();
  const router = useRouter();
  let currPlayer: 0 | 1 = gameConfig.turnStr == "0" ? 0 : 1;

  // TODO: ADD TOASTS
  // add disconnect notification
  // add connect notification
  // add ability to restart game in remote mode
  // add indicator for remote/self
  // add share link
  // update ws to use wss in production
  // add move history
  // add win probability prediction
  function handlePieceSelection(
    pieceIndex: number,
    triggeredByRemote: boolean
  ): boolean {
    // ensure that player a does not make moves before player b joins
    if (
      realtimeConfig &&
      playerB.type != PlayerType.Remote &&
      playerA.type != PlayerType.Remote
    ) {
      return false;
    }

    // ensure remote does not trigger move for non remote player
    if (
      triggeredByRemote &&
      currPlayer == 0 &&
      playerA.type != PlayerType.Remote
    ) {
      return false;
    }
    if (
      triggeredByRemote &&
      currPlayer == 1 &&
      playerB.type != PlayerType.Remote
    ) {
      return false;
    }
    // ensure non remote does not trigger move for remote player
    if (
      (!triggeredByRemote &&
        currPlayer == 0 &&
        playerA.type == PlayerType.Remote) ||
      (!triggeredByRemote &&
        currPlayer == 1 &&
        playerB.type == PlayerType.Remote)
    ) {
      return false;
    }
    const res: IBoardUpdate | null = playAtPieceIndex(
      board,
      pieceIndex,
      currPlayer
    );
    if (!res) return false;
    // update query params with board strings
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.set("board", res.boardStr);
    queryParams.set("turn", res.turnStr);
    queryParams.set("lastPiece", res.lastPieceStr);
    // update url
    router.push(`${pathName}?${queryParams.toString()}`);
    if (realtimeConfig) {
      // send move to websocket
      let realtimeMove: IRealtimeMove = {
        move_index: pieceIndex,
        player: currPlayer,
      };
      socket?.send(JSON.stringify(realtimeMove));
    }
    dispatch({
      type: "UPDATE_BOARD",
      payload: res,
    });
    return true;
  }

  function handleReset() {
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.set("board", "");
    queryParams.set("turn", "");
    queryParams.set("lastPiece", "");
    // update url back
    router.push(`/`);
    // TODO: CONSIDER ALLLOWING RESET OF REMOTE GAMES
    setRealtimeConfig(null);
    // socket?.close();
    // setSocket(null);
    dispatch(resetGame());
  }

  // toggle current turn
  function handleTurnToggle() {
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.set("turn", currPlayer == 0 ? "1" : "0");
    router.push(`${pathName}?${queryParams.toString()}`);
    dispatch(toggleTurn());
  }

  function handleAiToggle(player: IPlayer) {
    if (player == playerA) {
      dispatch(toggle_playerA_Ai());
    } else {
      dispatch(toggle_playerB_Ai());
    }
  }

  function getQueryOnLoad() {
    const queryParams = new URLSearchParams(window.location.search);
    const boardStr = queryParams.get("board");
    const board = boardFromString(boardStr ?? "");
    const turnStr = queryParams.get("turn");
    const lastPieceStr = queryParams.get("lastPiece");

    const gameUpdate: IBoardUpdate = {
      boardStr: boardStr ?? "",
      turnStr: turnStr ?? "",
      lastPieceStr: lastPieceStr ?? "",
      board,
    };
    if (boardStr && turnStr && lastPieceStr) {
      dispatch({
        type: "UPDATE_BOARD",
        payload: gameUpdate,
      });
    }
  }

  async function play_for_ai() {
    let new_move: number | null = null;
    // start timer to see how long request takes
    let startTime = Date.now();
    // handle turn toggle for ai agent a
    if (
      playerA.type == PlayerType.AI &&
      !playerA.hasMove &&
      playerB.hasMove &&
      gameConfig.turnStr == "0"
    ) {
      handleTurnToggle();
    }
    // handle turn toggle for ai agent b
    if (
      playerB.type == PlayerType.AI &&
      !playerB.hasMove &&
      playerA.hasMove &&
      gameConfig.turnStr == "1"
    ) {
      handleTurnToggle();
    }
    // if player a is ai and its their turn
    if (playerA.type == PlayerType.AI && gameConfig.turnStr == "0") {
      setLoadingAiMove(true);
      // request ai move
      const res = await requestNextMoveFromAi(board, 0);
      new_move = res?.move_index;
    }
    // if player b is ai and its their turn
    if (playerB.type == PlayerType.AI && gameConfig.turnStr == "1") {
      setLoadingAiMove(true);
      // request ai move
      const res = await requestNextMoveFromAi(board, 1);
      new_move = res?.move_index;
    }
    if (new_move != null) {
      let end_time = Date.now();
      // check how long it took
      let time_taken = end_time - startTime;
      if (time_taken < 500) {
        // if it took less than half a second, wait half a second
        await new Promise((r) => setTimeout(r, 500));
      }
      // to one hundredth of a second
      const timeAsSeconds = Math.round(time_taken / 10) / 100;
      // update seconds since last ai move
      setSecondsForLastAiMove(timeAsSeconds);
      handlePieceSelection(new_move, false);
    }
    if (
      new_move == null &&
      (playerA.type == PlayerType.AI || playerB.type == PlayerType.AI)
    ) {
      console.error("Unable to get AI move");
    }
    setLoadingAiMove(false);
  }

  useEffect(() => {
    play_for_ai();
  }, [board, playerA, playerB]);

  function handleStartRemoteGame() {
    // navigate to the game with the game id
    // make new id that is eight characters long
    const newGameId = Math.random().toString(36).substring(2, 10);
    let linkToGame = `${window.location.origin}/live/${newGameId}`;
    // copy to clipboard
    navigator.clipboard.writeText(linkToGame);
    toast.success("Copied game link to clipboard");
    router.push(`/live/${newGameId}`);
  }

  useEffect(() => {
    getQueryOnLoad();
  }, []);

  useEffect(() => {
    if (!realtimeConfig) return;
    // if we already have a socket, close it
    if (socket) {
      socket.close();
    }
    setWaitingForPlayer(true);
    // get is produ environment variable
    let isProd = process.env.NEXT_PUBLIC_IS_PROD?.toLowerCase() == "true";
    let proto = isProd ? "wss" : "ws";
    // set up web socket
    // set up web socket connection
    let backendHost = isProd
      ? process.env.NEXT_PUBLIC_API_HOST_PROD
      : process.env.NEXT_PUBLIC_API_HOST_DEV;
    const newWebsocket = new WebSocket(`${proto}://${backendHost}/ws`);
    newWebsocket.onopen = () => {
      console.log("connected");
      if (realtimeConfig) {
        console.log("joining room with id", realtimeConfig.gameId);
        // join room
        newWebsocket.send(`/join ${realtimeConfig.gameId}`);
      }
    };
    newWebsocket.onmessage = (event) => {
      if (!realtimeConfig) return;
      let newMsg = event.data;
      setMostRecentMessage(newMsg);
      if (newMsg.includes("Someone joined")) {
        newWebsocket.send("you are player b");
      }
    };
    newWebsocket.onclose = () => {
      toast.error("Disconnected from game");
      console.log("disconnected");
    };
    // set socket state
    setSocket(newWebsocket);
  }, [realtimeConfig]);

  useEffect(() => {
    console.log("player b is remote", playerB.type == PlayerType.Remote);
    console.log("player a is remote", playerA.type == PlayerType.Remote);
    console.log("Received message", mostRecentMessage);

    // if someone else joined the game, then we set player b to remote
    if (mostRecentMessage.includes("Someone joined")) {
      console.log("Setting player b to remote");
      dispatch(toggle_PlayerB_Remote());
      setWaitingForPlayer(false);
      toast.success("Another player has joined the game!");
    }
    // if someone disconnedcted, let player know
    // TODO: ADD ADDITIONAL HANDLING INCLUDING RESTORING GAME FROM CURRENT STATE
    if (mostRecentMessage.includes("Someone disconnected")) {
      console.log("Someone disconnected");
      setWaitingForPlayer(true);
      toast.error("Other player disconnected");
      // for now just reset the game
      handleReset();
    }
    if (mostRecentMessage.includes("you are player b")) {
      console.log("Setting player a to remote");
      toast.success("You are player b!");
      setWaitingForPlayer(false);
      dispatch(toggle_PlayerA_Remote());
    }
    // check if message is a move
    if (mostRecentMessage.includes("move_index")) {
      let move: IRealtimeMove = JSON.parse(mostRecentMessage);
      let move_index = move.move_index;
      let player = move.player;
      // make move
      // validation should occur on the
      // implementation of the function below
      handlePieceSelection(move_index, true);
    }
  }, [mostRecentMessage]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-2 h-fit max-w-4xl mx-auto gap-x-4 text-lg md:text-2xl">
        <div className="flex flex-row bg-black text-white rounded-full px-3 py-2">
          {playerA.name} ({playerA.score}) {currPlayer == 0 ? "To Play" : ""}
          {!playerA.hasMove && playerB.hasMove && gameConfig.turnStr == "0" && (
            <p
              className="text-yellow-500 underline hover:cursor-pointer ml-3"
              onClick={handleTurnToggle}
            >
              Skip Turn
            </p>
          )}
          {
            // game over and player a has more points
            !playerA.hasMove &&
              !playerB.hasMove &&
              playerA.score > playerB.score && (
                <p className="text-green-500 ml-3">Winner!</p>
              )
          }
          {
            // game over and tie
            !playerA.hasMove &&
              !playerB.hasMove &&
              playerA.score == playerB.score && (
                <p className="text-green-500 ml-3">Tie!</p>
              )
          }
          {/* ai checkbozx if not remote */}
          {playerA.type != PlayerType.Remote && (
            <div className="flex-grow">
              {/* checkbox for ai */}
              <div className="flex flex-row-reverse">
                <input
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-green-500 my-auto"
                  checked={playerA.type == PlayerType.AI}
                  onChange={() => handleAiToggle(playerA)}
                ></input>
                <p className="text-white mr-2">AI</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-row bg-white rounded-full px-3 py-2">
          {playerB.name} ({playerB.score}) {currPlayer == 1 ? "To Play" : ""}
          {!playerB.hasMove && playerA.hasMove && gameConfig.turnStr == "1" && (
            <p
              className="text-yellow-500 underline hover:cursor-pointer ml-3"
              onClick={handleTurnToggle}
            >
              Skip Turn
            </p>
          )}
          {
            // game over and player b has more points
            !playerB.hasMove &&
              !playerA.hasMove &&
              playerB.score > playerA.score && (
                <p className="text-green-500 ml-3">Winner!</p>
              )
          }
          {
            // game over and tie
            !playerB.hasMove &&
              !playerA.hasMove &&
              playerB.score == playerA.score && (
                <p className="text-green-500 ml-3">Tie!</p>
              )
          }
          {/* AI CHECKBOX DIV if not remote */}
          {playerB.type != PlayerType.Remote && (
            <div className="flex-grow">
              {/* checkbox for ai */}
              <div className="flex flex-row-reverse">
                <input
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-green-500 my-auto"
                  checked={playerB.type == PlayerType.AI}
                  onChange={() => handleAiToggle(playerB)}
                ></input>
                <p className="text-black mr-2">AI</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="bg-green-700 rounded-2xl grid grid-cols-8 gap-x-2 gap-y-2 mt-8 px-3 py-5">
        {board.map((player, index) => {
          return (
            <OthelloPiece
              key={index}
              pieceIndex={index}
              playerIndex={player}
              handlePieceSelection={handlePieceSelection}
              wasLastMove={index == Number(gameConfig.lastPieceStr)}
            />
          );
        })}
      </div>

      <div className="w-full flex flex-col v">
        <div className="w-full flex flex-row ">
          {/* option to reset game */}
          <p
            className="text-left text-lg md:text-2xl underline hover:cursor-pointer"
            onClick={handleReset}
          >
            Reset Game
          </p>
          <div className="flex-grow ">
            {/* spinner if loading ai move */}
            {loadingAiMove && (
              <div className="flex flex-row-reverse ">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500 "></div>
                <span className="text-lg mr-2 text-center text-gray-500 mr-2">
                  AI is thinking...
                </span>
              </div>
            )}
            {!loadingAiMove && secondsForLastAiMove > 0 && (
              <div className="flex flex-row-reverse ">
                <span className="text-lg mr-2 text-center text-gray-500 mr-2">
                  AI took {secondsForLastAiMove} seconds
                </span>
              </div>
            )}
          </div>
        </div>
        {waitingForPlayer && (
          <div className="w-full flex flex-row ">
            <p className="text-left text-lg md:text-2xl">
              Waiting for player to join...
            </p>
          </div>
        )}
        {!waitingForPlayer && realtimeConfig == null && (
          <div className="w-full flex flex-row ">
            {/* option to reset game */}
            <p
              className="text-left text-lg md:text-2xl underline hover:cursor-pointer"
              onClick={handleStartRemoteGame}
            >
              Start Remote Game
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
