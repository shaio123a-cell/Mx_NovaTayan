# Try/Catch Verification Suite

This document defines the critical test scenarios required to ensure the stability and reliability of the Try/Catch and Retry mechanisms in NovaTayan.

## 1. Backoff & Retry Logic (Unit Tests)
| Scenario | Input | Expected Outcome |
| :--- | :--- | :--- |
| **Exponential Backoff** | Initial: 5s, Attempt: 3 | Next delay should be 20s (5 * 2^(3-1)). |
| **Linear Backoff** | Initial: 5s, Attempt: 4 | Next delay should be 20s (5 * 4). |
| **Max Delay Cap** | Initial: 10s, Max: 30s, Exp | Delay should never exceed 30s even if calculation results in 80s. |
| **Max Attempts** | Max: 3, Failures: 4 | On the 4th failure, the system must trigger the Catch Handler. |

## 2. Layout & Designer Integrity (UX Tests)
| Scenario | Action | Expected Outcome |
| :--- | :--- | :--- |
| **The "Scoop"** | Drag a TryZone over 3 existing nodes. | Those 3 nodes should automatically become children (`parentNode` assigned) and be "scooped" into the zone. |
| **Cascading Push** | Resize TryZone to the right into a cluster of nodes. | All nodes to the right should "shift" right maintaining their relative padding, with no overlaps. |
| **Zone Move** | Drag a TryZone to a new location. | All child nodes must move perfectly in sync with the parent. |
| **Zone Deletion** | Delete a TryZone with 5 members. | System must ask: "Delete all members?" or "Keep members?" (Orphan cleanup). |

## 3. Runtime & Execution (Integration Tests)
| Scenario | Setup | Expected Outcome |
| :--- | :--- | :--- |
| **Catch Success** | Node fails -> Retries exhausted. | Execution jumps to the `catchHandlerId`. |
| **Context Enrichment** | Catch path triggered. | The `_error` variable must contain `nodeId`, `errorMessage`, and `attemptCount`. |
| **Missing Catch** | Policy: `FAIL_WORKFLOW`, No Catch connected. | The entire workflow execution transitions to `FAILED` state. |
| **Nested Try** | Node fails inside nested TryZones. | The innermost TryZone handles the retry first; if exhausted, it bubbles to its own Catch or the outer Try. |
