declare module '@accedo/xdk-virtual-key' {
  type Mapping = {
    vKey: { [key: string]: string | number };
  };

  export const recode: (
    oldCode: string,
    code: string,
    key?: string,
  ) => KeyboardEvent;

  export const addVKeys: (mapping: Mapping, iterable: MapConstructor) => void;

  export const addVKey: (
    mapping: Mapping,
    code: string,
    value: string | number,
  ) => void;

  export type Key = {
    id: string;
    text?: string;
  };

  export const vKey: {
    BACK: { id: 'device:vkey:back' };
    BLUE: { id: 'device:vkey:blue' };
    DOWN: { id: 'device:vkey:down' };
    EXIT: { id: 'device:vkey:exit' };
    FF: { id: 'device:vkey:ff' };
    GREEN: { id: 'device:vkey:green' };
    INFO: { id: 'device:vkey:info' };
    KEY_0: { id: 'device:vkey:0'; text: '0' };
    KEY_1: { id: 'device:vkey:1'; text: '1' };
    KEY_2: { id: 'device:vkey:2'; text: '2' };
    KEY_3: { id: 'device:vkey:3'; text: '3' };
    KEY_4: { id: 'device:vkey:4'; text: '4' };
    KEY_5: { id: 'device:vkey:5'; text: '5' };
    KEY_6: { id: 'device:vkey:6'; text: '6' };
    KEY_7: { id: 'device:vkey:7'; text: '7' };
    KEY_8: { id: 'device:vkey:8'; text: '8' };
    KEY_9: { id: 'device:vkey:9'; text: '9' };
    LEFT: { id: 'device:vkey:left' };
    MENU: { id: 'device:vkey:menu' };
    NEXT: { id: 'device:vkey:next' };
    OK: { id: 'device:vkey:ok' };
    PAUSE: { id: 'device:vkey:pause' };
    PLAY: { id: 'device:vkey:play' };
    PLAY_PAUSE: { id: 'device:vkey:playPause' };
    PREV: { id: 'device:vkey:prev' };
    RED: { id: 'device:vkey:red' };
    RIGHT: { id: 'device:vkey:right' };
    RW: { id: 'device:vkey:rw' };
    STOP: { id: 'device:vkey:stop' };
    SUBTITLE: { id: 'device:vkey:subtitle' };
    UP: { id: 'device:vkey:up' };
    YELLOW: { id: 'device:vkey:yellow' };
  };

  export const keyboardVKey: {
    UPPERCASE: {
      A: {
        id: 'device:kb-vkey:A';
        text: 'A';
      };
      B: {
        id: 'device:kb-vkey:B';
        text: 'B';
      };
      C: {
        id: 'device:kb-vkey:C';
        text: 'C';
      };
      D: {
        id: 'device:kb-vkey:D';
        text: 'D';
      };
      E: {
        id: 'device:kb-vkey:E';
        text: 'E';
      };
      F: {
        id: 'device:kb-vkey:F';
        text: 'F';
      };
      G: {
        id: 'device:kb-vkey:G';
        text: 'G';
      };
      H: {
        id: 'device:kb-vkey:H';
        text: 'H';
      };
      I: {
        id: 'device:kb-vkey:I';
        text: 'I';
      };
      J: {
        id: 'device:kb-vkey:J';
        text: 'J';
      };
      K: {
        id: 'device:kb-vkey:K';
        text: 'K';
      };
      L: {
        id: 'device:kb-vkey:L';
        text: 'L';
      };
      M: {
        id: 'device:kb-vkey:M';
        text: 'M';
      };
      N: {
        id: 'device:kb-vkey:N';
        text: 'N';
      };
      O: {
        id: 'device:kb-vkey:O';
        text: 'O';
      };
      P: {
        id: 'device:kb-vkey:P';
        text: 'P';
      };
      Q: {
        id: 'device:kb-vkey:Q';
        text: 'Q';
      };
      R: {
        id: 'device:kb-vkey:R';
        text: 'R';
      };
      S: {
        id: 'device:kb-vkey:S';
        text: 'S';
      };
      T: {
        id: 'device:kb-vkey:T';
        text: 'T';
      };
      U: {
        id: 'device:kb-vkey:U';
        text: 'U';
      };
      V: {
        id: 'device:kb-vkey:V';
        text: 'V';
      };
      W: {
        id: 'device:kb-vkey:W';
        text: 'W';
      };
      X: {
        id: 'device:kb-vkey:X';
        text: 'X';
      };
      Y: {
        id: 'device:kb-vkey:Y';
        text: 'Y';
      };
      Z: {
        id: 'device:kb-vkey:Z';
        text: 'Z';
      };
    };
    LOWERCASE: {
      A_LOWER: {
        id: 'device:kb-vkey:a';
        text: 'a';
      };
      B_LOWER: {
        id: 'device:kb-vkey:b';
        text: 'b';
      };
      C_LOWER: {
        id: 'device:kb-vkey:c';
        text: 'c';
      };
      D_LOWER: {
        id: 'device:kb-vkey:d';
        text: 'd';
      };
      E_LOWER: {
        id: 'device:kb-vkey:e';
        text: 'e';
      };
      F_LOWER: {
        id: 'device:kb-vkey:f';
        text: 'f';
      };
      G_LOWER: {
        id: 'device:kb-vkey:g';
        text: 'g';
      };
      H_LOWER: {
        id: 'device:kb-vkey:h';
        text: 'h';
      };
      I_LOWER: {
        id: 'device:kb-vkey:i';
        text: 'i';
      };
      J_LOWER: {
        id: 'device:kb-vkey:j';
        text: 'j';
      };
      K_LOWER: {
        id: 'device:kb-vkey:k';
        text: 'k';
      };
      L_LOWER: {
        id: 'device:kb-vkey:l';
        text: 'l';
      };
      M_LOWER: {
        id: 'device:kb-vkey:m';
        text: 'm';
      };
      N_LOWER: {
        id: 'device:kb-vkey:n';
        text: 'n';
      };
      O_LOWER: {
        id: 'device:kb-vkey:o';
        text: 'o';
      };
      P_LOWER: {
        id: 'device:kb-vkey:p';
        text: 'p';
      };
      Q_LOWER: {
        id: 'device:kb-vkey:q';
        text: 'q';
      };
      R_LOWER: {
        id: 'device:kb-vkey:r';
        text: 'r';
      };
      S_LOWER: {
        id: 'device:kb-vkey:s';
        text: 's';
      };
      T_LOWER: {
        id: 'device:kb-vkey:t';
        text: 't';
      };
      U_LOWER: {
        id: 'device:kb-vkey:u';
        text: 'u';
      };
      V_LOWER: {
        id: 'device:kb-vkey:v';
        text: 'v';
      };
      W_LOWER: {
        id: 'device:kb-vkey:w';
        text: 'w';
      };
      X_LOWER: {
        id: 'device:kb-vkey:x';
        text: 'x';
      };
      Y_LOWER: {
        id: 'device:kb-vkey:y';
        text: 'y';
      };
      Z_LOWER: {
        id: 'device:kb-vkey:z';
        text: 'z';
      };
    };
    SYMBOL: {
      SPACE: {
        id: 'device:kb-vkey:space';
        text: ' ';
      };
      TILDE: {
        id: 'device:kb-vkey:~';
        text: '~';
      };
      BACK_QUOTE: {
        id: 'device:kb-vkey:`';
        text: '`';
      };
      EXC: {
        id: 'device:kb-vkey:!';
        text: '!';
      };
      AT: {
        id: 'device:kb-vkey:@';
        text: '@';
      };
      HASH: {
        id: 'device:kb-vkey:#';
        text: '#';
      };
      DOLLAR: {
        id: 'device:kb-vkey:$';
        text: '$';
      };
      PERCENT: {
        id: 'device:kb-vkey:%';
        text: '%';
      };
      CARET: {
        id: 'device:kb-vkey:^';
        text: '^';
      };
      AMP: {
        id: 'device:kb-vkey:&';
        text: '&';
      };
      STAR: {
        id: 'device:kb-vkey:*';
        text: '*';
      };
      OPEN_PAREN: {
        id: 'device:kb-vkey:(';
        text: '(';
      };
      CLOSE_PAREN: {
        id: 'device:kb-vkey:)';
        text: ')';
      };
      MINUS: {
        id: 'device:kb-vkey:-';
        text: '-';
      };
      UNDERSCORE: {
        id: 'device:kb-vkey:_';
        text: '_';
      };
      EQUALS: {
        id: 'device:kb-vkey:=';
        text: '=';
      };
      PLUS: {
        id: 'device:kb-vkey:+';
        text: '+';
      };
      OPEN_BRACKET: {
        id: 'device:kb-vkey:[';
        text: '[';
      };
      OPEN_BRACE: {
        id: 'device:kb-vkey:{';
        text: '{';
      };
      CLOSE_BRACKET: {
        id: 'device:kb-vkey:]';
        text: ']';
      };
      CLOSE_BRACE: {
        id: 'device:kb-vkey:}';
        text: '}';
      };
      BACK_SLASH: {
        id: 'device:kb-vkey:\\';
        text: '\\';
      };
      PIPE: {
        id: 'device:kb-vkey:|';
        text: '|';
      };
      SEMICOLON: {
        id: 'device:kb-vkey:;';
        text: ';';
      };
      COLON: {
        id: 'device:kb-vkey::';
        text: ':';
      };
      SINGLE_QUOTE: {
        id: "device:kb-vkey:'";
        text: "'";
      };
      QUOTE: {
        id: 'device:kb-vkey:"';
        text: '"';
      };
      COMMA: {
        id: 'device:kb-vkey:,';
        text: ',';
      };
      LESS: {
        id: 'device:kb-vkey:<';
        text: '<';
      };
      PERIOD: {
        id: 'device:kb-vkey:.';
        text: '.';
      };
      GREATER: {
        id: 'device:kb-vkey:>';
        text: '>';
      };
      SLASH: {
        id: 'device:kb-vkey:/';
        text: '/';
      };
      QUESTION: {
        id: 'device:kb-vkey:?';
        text: '?';
      };
    };
    CONTROL_CHARACTERS: {
      BACKSPACE: {
        id: 'device:kb-vkey:backspace';
      };
      TAB: {
        id: 'device:kb-vkey:tab';
      };
      INSERT: {
        id: 'device:kb-vkey:insert';
      };
      DELETE: {
        id: 'device:kb-vkey:delete';
      };
      HOME: {
        id: 'device:kb-vkey:home';
      };
      END: {
        id: 'device:kb-vkey:end';
      };
      PAGE_UP: {
        id: 'device:kb-vkey:page-up';
      };
      PAGE_DOWN: {
        id: 'device:kb-vkey:page-down';
      };
      ESCAPE: {
        id: 'device:kb-vkey:escape';
      };
    };
    vKey: typeof vKey;
  };

  export const keyMap: {
    REMOTE: {
      VKey: {
        '13': {
          id: 'device:vkey:ok';
        };
        '37': {
          id: 'device:vkey:left';
        };
        '38': {
          id: 'device:vkey:up';
        };
        '39': {
          id: 'device:vkey:right';
        };
        '40': {
          id: 'device:vkey:down';
        };
        '48': {
          id: 'device:vkey:0';
          text: '0';
        };
        '49': {
          id: 'device:vkey:1';
          text: '1';
        };
        '50': {
          id: 'device:vkey:2';
          text: '2';
        };
        '51': {
          id: 'device:vkey:3';
          text: '3';
        };
        '52': {
          id: 'device:vkey:4';
          text: '4';
        };
        '53': {
          id: 'device:vkey:5';
          text: '5';
        };
        '54': {
          id: 'device:vkey:6';
          text: '6';
        };
        '55': {
          id: 'device:vkey:7';
          text: '7';
        };
        '56': {
          id: 'device:vkey:8';
          text: '8';
        };
        '57': {
          id: 'device:vkey:9';
          text: '9';
        };
      };
      keyCode: {
        UP: 38;
        DOWN: 40;
        LEFT: 37;
        RIGHT: 39;
        OK: 13;
        KEY_0: 48;
        KEY_1: 49;
        KEY_2: 50;
        KEY_3: 51;
        KEY_4: 52;
        KEY_5: 53;
        KEY_6: 54;
        KEY_7: 55;
        KEY_8: 56;
        KEY_9: 57;
      };
    };
    KEYBOARD_KEY: {
      VKey: {
        '8': {
          id: 'device:kb-vkey:backspace';
        };
        '9': {
          id: 'device:kb-vkey:tab';
        };
        '13': {
          id: 'device:vkey:ok';
        };
        '19': {
          id: 'device:vkey:pause';
        };
        '27': {
          id: 'device:kb-vkey:escape';
        };
        '33': {
          id: 'device:kb-vkey:page-up';
        };
        '34': {
          id: 'device:kb-vkey:page-down';
        };
        '35': {
          id: 'device:kb-vkey:end';
        };
        '36': {
          id: 'device:kb-vkey:home';
        };
        '37': {
          id: 'device:vkey:left';
        };
        '38': {
          id: 'device:vkey:up';
        };
        '39': {
          id: 'device:vkey:right';
        };
        '40': {
          id: 'device:vkey:down';
        };
        '45': {
          id: 'device:kb-vkey:insert';
        };
        '46': {
          id: 'device:kb-vkey:delete';
        };
      };
      keyCode: {
        UP: 38;
        DOWN: 40;
        LEFT: 37;
        RIGHT: 39;
        OK: 13;
        PAGE_UP: 33;
        PAGE_DOWN: 34;
        END: 35;
        HOME: 36;
        PAUSE: 19;
        TAB: 9;
        INSERT: 45;
        DELETE: 46;
        BACKSPACE: 8;
        ESCAPE: 27;
      };
    };
    KEYBOARD_CHAR: {
      VKey: {
        '32': {
          id: 'device:kb-vkey:space';
          text: ' ';
        };
        '33': {
          id: 'device:kb-vkey:!';
          text: '!';
        };
        '35': {
          id: 'device:kb-vkey:#';
          text: '#';
        };
        '36': {
          id: 'device:kb-vkey:$';
          text: '$';
        };
        '37': {
          id: 'device:kb-vkey:%';
          text: '%';
        };
        '38': {
          id: 'device:kb-vkey:&';
          text: '&';
        };
        '39': {
          id: "device:kb-vkey:'";
          text: "'";
        };
        '40': {
          id: 'device:kb-vkey:(';
          text: '(';
        };
        '41': {
          id: 'device:kb-vkey:)';
          text: ')';
        };
        '42': {
          id: 'device:kb-vkey:*';
          text: '*';
        };
        '43': {
          id: 'device:kb-vkey:+';
          text: '+';
        };
        '44': {
          id: 'device:kb-vkey:,';
          text: ',';
        };
        '45': {
          id: 'device:kb-vkey:-';
          text: '-';
        };
        '46': {
          id: 'device:kb-vkey:.';
          text: '.';
        };
        '47': {
          id: 'device:kb-vkey:/';
          text: '/';
        };
        '48': {
          id: 'device:vkey:0';
          text: '0';
        };
        '49': {
          id: 'device:vkey:1';
          text: '1';
        };
        '50': {
          id: 'device:vkey:2';
          text: '2';
        };
        '51': {
          id: 'device:vkey:3';
          text: '3';
        };
        '52': {
          id: 'device:vkey:4';
          text: '4';
        };
        '53': {
          id: 'device:vkey:5';
          text: '5';
        };
        '54': {
          id: 'device:vkey:6';
          text: '6';
        };
        '55': {
          id: 'device:vkey:7';
          text: '7';
        };
        '56': {
          id: 'device:vkey:8';
          text: '8';
        };
        '57': {
          id: 'device:vkey:9';
          text: '9';
        };
        '58': {
          id: 'device:kb-vkey::';
          text: ':';
        };
        '59': {
          id: 'device:kb-vkey:;';
          text: ';';
        };
        '60': {
          id: 'device:kb-vkey:<';
          text: '<';
        };
        '61': {
          id: 'device:kb-vkey:=';
          text: '=';
        };
        '62': {
          id: 'device:kb-vkey:>';
          text: '>';
        };
        '63': {
          id: 'device:kb-vkey:?';
          text: '?';
        };
        '64': {
          id: 'device:kb-vkey:@';
          text: '@';
        };
        '91': {
          id: 'device:kb-vkey:[';
          text: '[';
        };
        '92': {
          id: 'device:kb-vkey:\\';
          text: '\\';
        };
        '93': {
          id: 'device:kb-vkey:]';
          text: ']';
        };
        '94': {
          id: 'device:kb-vkey:^';
          text: '^';
        };
        '95': {
          id: 'device:kb-vkey:_';
          text: '_';
        };
        '96': {
          id: 'device:kb-vkey:`';
          text: '`';
        };
        '123': {
          id: 'device:kb-vkey:{';
          text: '{';
        };
        '124': {
          id: 'device:kb-vkey:|';
          text: '|';
        };
        '125': {
          id: 'device:kb-vkey:}';
          text: '}';
        };
        '126': {
          id: 'device:kb-vkey:~';
          text: '~';
        };
      };
      keyCode: {
        SPACE: 32;
        EXC: 33;
        HASH: 35;
        DOLLAR: 36;
        PERCENT: 37;
        AMP: 38;
        SINGLE_QUOTE: 39;
        OPEN_PAREN: 40;
        CLOSE_PAREN: 41;
        STAR: 42;
        PLUS: 43;
        COMMA: 44;
        MINUS: 45;
        PERIOD: 46;
        SLASH: 47;
        COLON: 58;
        SEMICOLON: 59;
        LESS: 60;
        EQUALS: 61;
        GREATER: 62;
        QUESTION: 63;
        AT: 64;
        OPEN_BRACKET: 91;
        BACK_SLASH: 92;
        CLOSE_BRACKET: 93;
        CARET: 94;
        UNDERSCORE: 95;
        BACK_QUOTE: 96;
        OPEN_BRACE: 123;
        PIPE: 124;
        CLOSE_BRACE: 125;
        TILDE: 126;
        A: 65;
        A_LOWER: 97;
        B: 66;
        B_LOWER: 98;
        C: 67;
        C_LOWER: 99;
        D: 68;
        D_LOWER: 100;
        E: 69;
        E_LOWER: 101;
        F: 70;
        F_LOWER: 102;
        G: 71;
        G_LOWER: 103;
        H: 72;
        H_LOWER: 104;
        I: 73;
        I_LOWER: 105;
        J: 74;
        J_LOWER: 106;
        K: 75;
        K_LOWER: 107;
        L: 76;
        L_LOWER: 108;
        M: 77;
        M_LOWER: 109;
        N: 78;
        N_LOWER: 110;
        O: 79;
        O_LOWER: 111;
        P: 80;
        P_LOWER: 112;
        Q: 81;
        Q_LOWER: 113;
        R: 82;
        R_LOWER: 114;
        S: 83;
        S_LOWER: 115;
        T: 84;
        T_LOWER: 116;
        U: 85;
        U_LOWER: 117;
        V: 86;
        V_LOWER: 118;
        W: 87;
        W_LOWER: 119;
        X: 88;
        X_LOWER: 120;
        Y: 89;
        Y_LOWER: 121;
        Z: 90;
        Z_LOWER: 122;
        KEY_0: 48;
        KEY_1: 49;
        KEY_2: 50;
        KEY_3: 51;
        KEY_4: 52;
        KEY_5: 53;
        KEY_6: 54;
        KEY_7: 55;
        KEY_8: 56;
        KEY_9: 57;
      };
    };
  };
}
