"""Game tree nodes and builder interface.

The tree is composed of three node types:
- ActionNode: a player must choose an action
- ChanceNode: nature deals a card (or multiple)
- TerminalNode: hand is over, payoffs are known
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Sequence


class NodeType(Enum):
    ACTION = "action"
    CHANCE = "chance"
    TERMINAL = "terminal"


class Action(Enum):
    FOLD = "fold"
    CHECK = "check"
    CALL = "call"
    BET = "bet"
    RAISE = "raise"
    ALL_IN = "all_in"


@dataclass
class ActionInfo:
    """An available action at an action node."""
    action: Action
    amount: float = 0.0  # chip amount for bet/raise/all_in
    label: str = ""      # human-readable label, e.g. "bet_50"

    def __post_init__(self):
        if not self.label:
            if self.amount > 0:
                self.label = f"{self.action.value}_{int(self.amount)}"
            else:
                self.label = self.action.value


@dataclass
class GameNode:
    """Base class for all game tree nodes."""
    node_type: NodeType = NodeType.ACTION  # overridden by subclass __post_init__
    parent: GameNode | None = field(default=None, repr=False)
    depth: int = 0


@dataclass
class ActionNode(GameNode):
    """A node where a player must choose an action."""
    player: int = 0                       # 0 or 1
    actions: list[ActionInfo] = field(default_factory=list)
    children: dict[str, GameNode] = field(default_factory=dict)  # action_label -> child
    info_set_key: str = ""                # set during tree build
    pot: float = 0.0
    stacks: tuple[float, float] = (0.0, 0.0)

    def __post_init__(self):
        self.node_type = NodeType.ACTION


@dataclass
class ChanceNode(GameNode):
    """A node where nature deals cards."""
    outcomes: dict[str, tuple[float, GameNode]] = field(default_factory=dict)
    # outcome_label -> (probability, child_node)

    def __post_init__(self):
        self.node_type = NodeType.CHANCE


@dataclass
class TerminalNode(GameNode):
    """A node where the hand is over."""
    payoffs: tuple[float, ...] = (0.0, 0.0)  # one per player
    pot: float = 0.0
    is_showdown: bool = False

    def __post_init__(self):
        self.node_type = NodeType.TERMINAL


class TreeBuilder(ABC):
    """Abstract interface for building game trees for different variants."""

    @abstractmethod
    def build_tree(self) -> GameNode:
        """Build and return the root of the game tree."""

    @abstractmethod
    def get_info_set_key(self, player: int, cards: Sequence[int],
                         history: str, board: Sequence[int] = ()) -> str:
        """Generate info set key for a player's perspective."""


def count_nodes(root: GameNode) -> dict[str, int]:
    """Count nodes by type in the tree (for debugging/stats)."""
    counts = {"action": 0, "chance": 0, "terminal": 0}
    stack = [root]
    while stack:
        node = stack.pop()
        counts[node.node_type.value] += 1
        if isinstance(node, ActionNode):
            stack.extend(node.children.values())
        elif isinstance(node, ChanceNode):
            stack.extend(child for _, child in node.outcomes.values())
    return counts
