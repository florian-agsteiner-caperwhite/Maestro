import { AgentDetector } from '../../main/agents/detector';
import { getAgentDefinition } from '../../main/agents/definitions';
import type { ToolType } from '../../shared/types';
import { formatError, formatWarning } from '../output/formatter';
import { getSessionById, getAgentCustomPath, resolveAgentId } from '../services/storage';

interface ListAgentOptionsCommandOptions {
	json?: boolean;
}

function resolveAgent(agentIdArg: string): { toolType: ToolType; resolvedAgentId: string } {
	let resolvedAgentId: string;
	try {
		resolvedAgentId = resolveAgentId(agentIdArg);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		throw new Error(message);
	}

	const agent = getSessionById(resolvedAgentId);
	if (!agent) {
		throw new Error(`Agent not found: ${agentIdArg}`);
	}

	return { toolType: agent.toolType, resolvedAgentId };
}

function createDetector(toolType: ToolType): AgentDetector {
	const detector = new AgentDetector();
	const customPath = getAgentCustomPath(toolType);
	if (customPath) {
		detector.setCustomPaths({ [toolType]: customPath });
	}
	return detector;
}

function printOptions(options: string[], json?: boolean): void {
	if (json) {
		console.log(JSON.stringify(options, null, 2));
		return;
	}

	if (options.length === 0) {
		console.log(formatWarning('No options found.'));
		return;
	}

	console.log(options.join('\n'));
}

export async function listModels(
	agentIdArg: string,
	options: ListAgentOptionsCommandOptions
): Promise<void> {
	try {
		const { toolType } = resolveAgent(agentIdArg);
		const def = getAgentDefinition(toolType);
		if (!def?.modelArgs) {
			throw new Error(`Agent type "${toolType}" does not support model selection.`);
		}

		const detector = createDetector(toolType);
		const models = await detector.discoverModels(toolType);
		printOptions(models, options.json);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (options.json) {
			console.error(JSON.stringify({ error: message }));
		} else {
			console.error(formatError(message));
		}
		process.exit(1);
	}
}

export async function listEfforts(
	agentIdArg: string,
	options: ListAgentOptionsCommandOptions
): Promise<void> {
	try {
		const { toolType } = resolveAgent(agentIdArg);
		const def = getAgentDefinition(toolType);
		const effortOptionKey = def?.configOptions?.find(
			(option) => option.key === 'effort' || option.key === 'reasoningEffort'
		)?.key;

		if (!effortOptionKey) {
			throw new Error(`Agent type "${toolType}" does not support effort selection.`);
		}

		const detector = createDetector(toolType);
		const efforts = await detector.discoverConfigOptions(toolType, effortOptionKey);
		printOptions(efforts, options.json);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (options.json) {
			console.error(JSON.stringify({ error: message }));
		} else {
			console.error(formatError(message));
		}
		process.exit(1);
	}
}
