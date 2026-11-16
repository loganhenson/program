# A clean shell for recordings: oh-my-zsh with its default theme, no history,
# no personal configuration.
export ZSH="$HOME/.oh-my-zsh"
ZSH_CUSTOM="$ZDOTDIR/../zsh-custom"
ZSH_THEME="robbyrussell"
zstyle ':omz:update' mode disabled
DISABLE_AUTO_UPDATE=true
ZSH_COMPDUMP="$ZDOTDIR/.zcompdump"
plugins=(git)
source "$ZSH/oh-my-zsh.sh"
unset HISTFILE
SAVEHIST=0
ZSH_THEME_TERM_TITLE_IDLE="%~"
