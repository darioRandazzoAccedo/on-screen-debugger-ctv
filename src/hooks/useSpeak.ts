const noop = () => undefined;

const useSpeak = () => ({ speakText: noop, speakById: noop });

export default useSpeak;
