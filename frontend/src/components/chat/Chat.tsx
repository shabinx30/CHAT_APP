import { LuSendHorizontal } from "react-icons/lu";
import { ImAttachment } from "react-icons/im";
import { IoMdMore } from "react-icons/io";
import Message from "./Message";
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useSelector, type TypedUseSelectorHook } from "react-redux";
import type { RootState } from "../../redux/store";
import { useAppContext } from "../../context/AppContext";
import { AnimatePresence, motion } from "framer-motion";
import { MdKeyboardDoubleArrowDown } from "react-icons/md";
import { IoIosArrowBack } from "react-icons/io";
import debounce from "../../libs/debouncer";
import { VariableSizeList as List } from "react-window";

export const useTypedSelector: TypedUseSelectorHook<RootState> = useSelector;

interface chatType {
    _id: string;
    name: string;
    profile: string;
}

interface Msg {
    body: string;
    createdAt: number;
    from: string;
}

interface typing {
    isTyping: boolean;
    chatId: string;
}

const Chat = () => {
    const scrollRef = useRef<any>(null);
    const scrollRef2 = useRef<any>(null);
    const shouldScrollToBottom = useRef(false);
    const state = useTypedSelector((state) => state);
    const [messages, setMessages] = useState<Msg[]>([]);
    const { socket } = useAppContext();
    const navigate = useNavigate();
    const msgRef = useRef<HTMLTextAreaElement>(null);
    const { chatId } = useParams();
    const apiUrl = import.meta.env.VITE_BASE_URL;

    const [isLastMessageInView, setIsLastMessageInView] = useState(true);

    // Socket listener for new messages
    useEffect(() => {
        socket.on("chat message", (msg: any) => {
            if (msg.tosChat === chatId) {
                if (isLastMessageInView) {
                    shouldScrollToBottom.current = true;
                }
                setMessages((prev) => [...prev, msg]);
            }
        });
        return () => {
            socket.off("chat message");
        };
    }, [chatId, socket, isLastMessageInView]);

    const [chat, setChat] = useState<chatType>();
    const set = new Set();

    // Fetch initial messages
    useEffect(() => {
        setMessages([]);
        // Clear the item size map when switching chats
        itemSizeMap.current = {};
        
        axios
            .post(`${apiUrl}/api/message/getmessages`, { chatId })
            .then((res) => {
                const result = res.data.chat.members.filter(
                    (user: any) => user.userId._id !== state.auth.user.userId
                )[0];
                setChat(result.userId);
                const fetchedMessages = [];
                for (let data of res.data.messages) {
                    if (!set.has(data._id)) {
                        fetchedMessages.push(data);
                        set.add(data._id);
                    }
                }
                setMessages(fetchedMessages);
                shouldScrollToBottom.current = true;
            })
            .catch((error) => {
                console.log(error);
            });
    }, [chatId, apiUrl, state.auth.user.userId]);

    const [rotate, setRotate] = useState(0);

    const hello = useRef<boolean>(null);

    const sendMessage = (e: FormEvent<HTMLFormElement> | null = null) => {
        if (e) e.preventDefault();
        if (msgRef.current?.value.trim() || hello.current) {
            setRotate((prev) => prev + 360);
            const myMsg: Msg = {
                body: msgRef?.current?.value || "Hello👋",
                createdAt: Date.now(),
                from: state.auth.user.userId,
            };
            socket.emit("chat message", {
                msg: myMsg.body,
                chatId,
                from: state.auth.user.userId,
                to: chat?._id,
            });
            shouldScrollToBottom.current = true;
            setMessages((p) => [...p, myMsg]);
            if (msgRef.current) {
                msgRef.current.value = "";
            } else if (hello.current) {
                hello.current = false;
            }
        }
    };

    // Scroll to bottom when messages change and shouldScrollToBottom is true
    useEffect(() => {
        if (
            shouldScrollToBottom.current &&
            scrollRef2.current &&
            messages.length > 0
        ) {
            // Add a small delay to ensure all heights are calculated
            setTimeout(() => {
                scrollRef2.current?.scrollToItem(messages.length - 1, "end");
                setIsLastMessageInView(true);
                shouldScrollToBottom.current = false;
            }, 50);
        }
    }, [messages]);

    const scrollToBottom = () => {
        if (scrollRef2.current && messages.length > 0) {
            scrollRef2.current.scrollToItem(messages.length - 1, "end");
            setIsLastMessageInView(true);
        }
    };

    const [typing, setTyping] = useState<boolean>();
    const debouncedSearch = useCallback(
        debounce(() => setTyping(false), 500),
        []
    );

    const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (e.target.value.trim()) {
            setTyping(true);
            debouncedSearch();
        }
    };

    useEffect(() => {
        if (typeof typing === "boolean") {
            socket.emit("typing", { typing, chatId, to: chat?._id });
        }
    }, [typing, chatId, chat?._id, socket]);

    const [isTyping, setIsTyping] = useState<typing>();

    useEffect(() => {
        socket.on("typing", (res) => {
            setIsTyping({ isTyping: res.typing, chatId: res.chatId });
        });
        return () => {
            socket.off("typing");
        };
    }, [socket]);

    const [size, setSize] = useState(0);

    useEffect(() => {
        const handleResize = () => {
            const height = scrollRef.current?.clientHeight || 0;
            setSize(height);
            // Reset the list on resize to recalculate all visible item sizes
            scrollRef2.current?.resetAfterIndex(0);
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    const itemSizeMap = useRef<{ [index: number]: number }>({});
    
    // Improved getItemSize with better default height estimation
    const getItemSize = (index: number) => {
        if (itemSizeMap.current[index]) {
            return itemSizeMap.current[index];
        }
        
        // Better default height estimation based on message length
        const message = messages[index];
        if (message) {
            const textLength = message.body.length;
            // Estimate height based on text length (rough calculation)
            const estimatedLines = Math.ceil(textLength / 35); // ~35 chars per line
            const baseHeight = 60; // Base height for message bubble
            const lineHeight = 20; // Height per line of text
            return baseHeight + (estimatedLines * lineHeight);
        }
        
        return 80; // Fallback default
    };

    const setSizeForIndex = useCallback((index: number, size: number) => {
        // Add a small buffer to prevent cutting off
        const adjustedSize = size + 2;
        
        if (itemSizeMap.current[index] !== adjustedSize) {
            itemSizeMap.current[index] = adjustedSize;
            // Use requestAnimationFrame to ensure smooth updates
            requestAnimationFrame(() => {
                scrollRef2.current?.resetAfterIndex(index);
            });
        }
    }, []);

    return (
        <section
            className={`${
                chatId ? "flex-[calc(1/2.6*100%)]" : "hidden"
            } relative h-[100dvh] bg-[#e6ffcb] dark:bg-black`}
        >
            <div className="flex justify-center mt-2">
                <nav className="flex bg-white rounded-2xl dark:border dark:shadow-none shadow-[0_1px_10px] shadow-black/40 border-[#2b2b2b] dark:bg-[#121212] w-[90%] dark:text-[#fff] text-[#000000] items-center py-4 px-2 justify-between top-0 right-0 h-[8.5vh]">
                    <div className="flex items-center gap-1 md:gap-3 md:px-2">
                        <IoIosArrowBack
                            className="cursor-pointer"
                            onClick={() => navigate("/")}
                            size={30}
                        />
                        <img
                            className="object-cover min-w-[2.5em] max-h-[2.5em] rounded-full"
                            src={
                                chat?.profile ? chat.profile : "/icons/user.png"
                            }
                            alt={chat?.name}
                        />
                        <h1 className="font-semibold ml-2 md:m-0">
                            {chat?.name}
                        </h1>
                    </div>
                    <IoMdMore size={24} className="cursor-pointer" />
                </nav>
            </div>
            <div ref={scrollRef} className="h-[78vh] mt-2 px-2 md:px-4">
                {!messages.length ? (
                    <div className="flex justify-center items-center h-full">
                        <div
                            onClick={() => {
                                hello.current = true;
                                sendMessage();
                            }}
                            className="cursor-pointer border border-[#b0ff62] border-dashed rounded-3xl pt-1 pb-1.5 pl-3 pr-2"
                        >
                            Say Hello👋
                        </div>
                    </div>
                ) : (
                    <List
                        ref={scrollRef2}
                        className="bg-[#e6ff62] dark:bg-black scroll-smooth scrollable"
                        height={size}
                        itemCount={messages.length}
                        itemSize={getItemSize}
                        width="100%"
                        itemData={{
                            messages,
                            user: state.auth.user.userId,
                            setSizeForIndex,
                        }}
                        onScroll={({ scrollOffset }) => {
                            if (scrollRef.current) {
                                const totalHeight = messages
                                    .map((_, i) => getItemSize(i))
                                    .reduce((a, b) => a + b, 0);
                                const viewportHeight =
                                    scrollRef.current.clientHeight;
                                const isAtBottom =
                                    scrollOffset + viewportHeight >=
                                    totalHeight - 10; // Small buffer for better detection
                                setIsLastMessageInView(isAtBottom);
                            }
                        }}
                        // Add overscan to improve performance and height calculation
                        overscanCount={5}
                    >
                        {Message}
                    </List>
                )}
                <AnimatePresence>
                    {isTyping?.isTyping && chatId === isTyping.chatId && (
                        <motion.div className="text-white w-[3em] rounded-lg bg-[#fff] dark:bg-gray-800 ml-2 mt-0.5">
                            <img
                                className="object-cover"
                                src="/icons/5V1YDdBVLZ.gif"
                                alt="typing"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center bg-black"
            >
                <div className="absolute flex dark:border border-[#2b2b2b] bg-[#fff] dark:bg-[#1d1d1d] dark:shadow-none shadow-[0_1px_10px] shadow-black/50 rounded-2xl text-black justify-between pr-2 pl-5 gap-1 items-center bottom-4 w-[80%]">
                    <ImAttachment
                        size={18}
                        className="cursor-pointer dark:text-[#b0ff62]"
                    />
                    <form
                        className="w-full items-center"
                        onSubmit={sendMessage}
                    >
                        <textarea
                            ref={msgRef}
                            className="resize-none scrollable pt-4 dark:text-white w-full outline-none h-[3.4em] placeholder:text-gray-600 dark:placeholder:text-gray-400 px-2"
                            onChange={handleTyping}
                            placeholder="Type a message"
                            onKeyDown={(e) => {
                                if (e.key == "Enter") {
                                    if (e.shiftKey) {
                                        return;
                                    }
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                        ></textarea>
                    </form>
                    <div
                        onClick={() => sendMessage()}
                        className="bg-[#b0ff62] dark:text-black cursor-pointer py-2 pl-2.5 pr-1.5 rounded-[12px]"
                    >
                        <motion.div
                            animate={{ rotateY: rotate }}
                            transition={{
                                type: "spring",
                                stiffness: 120,
                                damping: 25,
                                duration: 1,
                            }}
                            className="transform-3d"
                        >
                            <LuSendHorizontal
                                className="translate-z-[4em]"
                                size={22}
                            />
                        </motion.div>
                    </div>
                </div>
            </motion.div>
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: isLastMessageInView ? 0 : 1 }}
                onClick={scrollToBottom}
                className="absolute cursor-pointer bg-white dark:bg-[#2b2b2b] dark:text-[#b0ff62] bottom-[5em] rounded-2xl shadow-[0_2px_10px] shadow-black/50 right-10 p-2"
            >
                <MdKeyboardDoubleArrowDown size={26} />
            </motion.div>
        </section>
    );
};

export default Chat;