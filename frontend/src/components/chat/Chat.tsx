import Message from "./Message";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTypedSelector } from "../../redux/store";
import { useAppContext } from "../../context/AppContext";
import { AnimatePresence, motion } from "framer-motion";
import { MdKeyboardDoubleArrowDown } from "react-icons/md";
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import useTyping from "../../hooks/useTyping";
import type { Msg } from "../../types/chat";
import useGetMsg from "../../hooks/chat/useGetMsg";
import useSendMsg from "../../hooks/chat/useSendMsg";

const Chat = () => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const endDiv = useRef<HTMLDivElement>(null);
    const user = useTypedSelector((state) => state?.auth?.user);
    const [messages, setMessages] = useState<Msg[]>([]);
    const [isInView, setIsInView] = useState<boolean>(false);
    const { preview } = useAppContext();
    const navigate = useNavigate();
    const msgRef = useRef<HTMLTextAreaElement>(null);
    const { chatId } = useParams();
    const attachRef = useRef<HTMLInputElement>(null);

    const hello = useRef<boolean>(null);

    const userId = user?.userId;

    // hooks ********************************************
    // Socket listener for new messages & getting messges
    const { chat, loading } = useGetMsg({ setMessages, userId, chatId });
    // get typing info
    const isTyping = useTyping();
    // send message hook
    const { sendMessage, rotate } = useSendMsg({
        setMessages,
        msgRef,
        attachRef,
        hello,
        chat,
    });

    useEffect(() => {
        if (!preview) {
            if (attachRef.current) {
                attachRef.current.value = "";
            }
        }
    }, [preview]);

    useEffect(() => {
        const isAtBottom = () => {
            if (scrollRef.current) {
                const { scrollTop, scrollHeight, clientHeight } =
                    scrollRef.current;
                return scrollTop + clientHeight >= scrollHeight - 1;
            }
        };

        const checkScrollPosition = () => {
            if (isAtBottom()) {
                setIsInView(false);
            } else {
                setIsInView(true);
            }
        };

        checkScrollPosition();

        // Add scroll event listener
        scrollRef.current?.addEventListener("scroll", checkScrollPosition);

        return () => {
            scrollRef.current?.removeEventListener(
                "scroll",
                checkScrollPosition
            );
        };
    }, []);

    return (
        <div className="absolute md:relative md:flex-[calc(1/2.6*100%)] w-full max-h-[100vh] z-50">
            <motion.section
                initial={window.innerWidth <= 768 && { x: 400, opacity: 0 }}
                animate={window.innerWidth <= 768 && { x: 0, opacity: 1 }}
                transition={{
                    type: "spring",
                    stiffness: 150,
                    damping: 25,
                    duration: 1,
                }}
                className={`${
                    chatId ? "flex-[calc(1/2.6*100%)]" : "hidden"
                } relative h-[100dvh] pattern`}
            >
                {/* chat info section  */}
                <ChatHeader chat={chat} navigate={navigate} />
                <div
                    ref={scrollRef}
                    className={`${loading ? "overflow-y-hidden" : "overflow-y-auto"} h-full py-[5.25em] flex flex-col-reverse scrollable px-2 md:px-4`}
                >
                    {!messages.length ? (
                        loading ? (
                            <div className="flex flex-col py-2">
                                {new Array(4).fill(0).map(() => (
                                    <>
                                        <div className="bg-[#b0ff62] dark:bg-[#3b3b3b] self-end w-[20%] mb-2 h-[2em] rounded-2xl animate-pulse" />
                                        <div className="bg-[#b0ff62] dark:bg-[#3b3b3b] self-end w-[40%] mb-[1em] h-[2em] rounded-2xl animate-pulse" />
                                        <div className="bg-[#b0ff62] dark:bg-[#3b3b3b] self-start w-[20%] h-[2em] mb-2 rounded-2xl animate-pulse" />
                                        <div className="bg-[#b0ff62] dark:bg-[#3b3b3b] self-start w-[40%] h-[2em] rounded-2xl animate-pulse" />
                                    </>
                                ))}
                            </div>
                        ) : (
                            <div className="flex justify-center items-center h-full">
                                <div
                                    onClick={() => {
                                        hello.current = true;
                                        sendMessage();
                                    }}
                                    className="cursor-pointer border border-black dark:border-[#b0ff62] border-dashed rounded-3xl pt-1 pb-1.5 pl-3 pr-2"
                                >
                                    Say Hello👋
                                </div>
                            </div>
                        )
                    ) : (
                        <>
                            {messages.map((message, i) => (
                                <Message
                                    key={i}
                                    message={message}
                                    user={userId}
                                    endDiv={0 == i ? endDiv : null}
                                />
                            ))}
                        </>
                    )}
                    <AnimatePresence>
                        {isTyping?.isTyping && chatId === isTyping.chatId && (
                            <motion.div className="hidden md:block text-white w-[3em] rounded-lg bg-[#fff] dark:bg-[#1b1b1b] ml-2 mt-0.5">
                                <img
                                    className="object-cover"
                                    src="/icons/5V1YDdBVLZ.gif"
                                    alt="typing"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {/* chat input section */}
                <ChatInput
                    rotate={rotate}
                    attachRef={attachRef}
                    msgRef={msgRef}
                    sendMessage={sendMessage}
                    chatId={chatId}
                    chat={chat}
                />
                {/* scroll to bottom button */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: !isInView ? 0 : 1 }}
                    onClick={() =>
                        endDiv.current?.scrollIntoView({ behavior: "instant" })
                    }
                    className="absolute cursor-pointer bg-white dark:bg-[#2b2b2b] dark:text-[#b0ff62] bottom-[6em] md:bottom-[5em] rounded-2xl shadow-[0_2px_10px] shadow-black/50 right-5 md:right-10 p-2"
                >
                    <MdKeyboardDoubleArrowDown size={26} />
                </motion.div>
            </motion.section>
        </div>
    );
};

export default Chat;
