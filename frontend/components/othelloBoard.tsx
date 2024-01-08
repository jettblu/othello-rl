"use client";
import { Provider, useSelector, useDispatch } from "react-redux";
import { IGlobalState } from "@/store/reducers";
import OthelloPiece from "./othelloPiece";
import store from "@/store";
import { boardFromString, playAtPieceIndex } from "@/helpers/gameplay";
import { IBoardUpdate } from "@/types";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { RESET_GAME, resetGame, toggleTurn } from "@/store/actions";

export default function OthelloBoard() {
  return (
    <Provider store={store}>
      <OthelloBoardInner />
    </Provider>
  );
}

function OthelloBoardInner() {
  const board = useSelector((state: IGlobalState) => state.board);
  const gameConfig = useSelector((state: IGlobalState) => state.gameAttrs);
  const playerA = useSelector((state: IGlobalState) => state.playerA);
  const playerB = useSelector((state: IGlobalState) => state.playerB);
  const dispatch = useDispatch();
  const pathName = usePathname();
  const router = useRouter();
  let currPlayer: 0 | 1 = gameConfig.turnStr == "0" ? 0 : 1;

  function handlePieceSelection(pieceIndex: number): boolean {
    const res: IBoardUpdate | null = playAtPieceIndex(
      board,
      pieceIndex,
      currPlayer
    );
    console.log("update res", res);
    console.log(playerB);
    if (!res) return false;
    // update query params with board strings
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.set("board", res.boardStr);
    queryParams.set("turn", res.turnStr);
    queryParams.set("lastPiece", res.lastPieceStr);
    // update url
    router.push(`${pathName}?${queryParams.toString()}`);
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
    // update url
    router.push(`${pathName}`);
    dispatch(resetGame());
  }

  function handleTurnToggle() {
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.set("turn", currPlayer == 0 ? "1" : "0");
    router.push(`${pathName}?${queryParams.toString()}`);
    dispatch(toggleTurn());
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

  useEffect(() => {
    getQueryOnLoad();
  }, []);

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
      {/* option to reset game */}
      <div className="mt-8">
        <p
          className="text-left text-lg md:text-2xl underline hover:cursor-pointer"
          onClick={handleReset}
        >
          Reset Game
        </p>
      </div>
    </div>
  );
}
