import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

const discoverModelsMock = vi.fn();
const discoverConfigOptionsMock = vi.fn();
const setCustomPathsMock = vi.fn();

vi.mock('../../../main/agents/detector', () => ({
	AgentDetector: class {
		discoverModels = discoverModelsMock;
		discoverConfigOptions = discoverConfigOptionsMock;
		setCustomPaths = setCustomPathsMock;
	},
}));

vi.mock('../../../cli/services/storage', () => ({
	resolveAgentId: vi.fn(),
	getSessionById: vi.fn(),
	getAgentCustomPath: vi.fn(),
}));

vi.mock('../../../main/agents/definitions', () => ({
	getAgentDefinition: vi.fn(),
}));

import { listEfforts, listModels } from '../../../cli/commands/list-agent-options';
import { getAgentDefinition } from '../../../main/agents/definitions';
import { getAgentCustomPath, getSessionById, resolveAgentId } from '../../../cli/services/storage';

describe('list agent options commands', () => {
	let consoleLogSpy: MockInstance;
	let consoleErrorSpy: MockInstance;
	let processExitSpy: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();
		consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
		vi.mocked(resolveAgentId).mockReturnValue('agent-1');
		vi.mocked(getSessionById).mockReturnValue({
			id: 'agent-1',
			name: 'Agent 1',
			toolType: 'claude-code',
			cwd: '/tmp/project',
			projectRoot: '/tmp/project',
		});
		vi.mocked(getAgentCustomPath).mockReturnValue(undefined);
	});

	it('lists models for a supported agent', async () => {
		vi.mocked(getAgentDefinition).mockReturnValue({
			id: 'claude-code',
			name: 'Claude Code',
			modelArgs: () => [],
		} as never);
		discoverModelsMock.mockResolvedValue(['sonnet', 'opus']);

		await listModels('agent-1', {});

		expect(discoverModelsMock).toHaveBeenCalledWith('claude-code');
		expect(consoleLogSpy).toHaveBeenCalledWith('sonnet\nopus');
		expect(processExitSpy).not.toHaveBeenCalled();
	});

	it('lists efforts for a supported agent', async () => {
		vi.mocked(getAgentDefinition).mockReturnValue({
			id: 'codex',
			name: 'Codex',
			configOptions: [{ key: 'reasoningEffort' }],
		} as never);
		vi.mocked(getSessionById).mockReturnValue({
			id: 'agent-1',
			name: 'Agent 1',
			toolType: 'codex',
			cwd: '/tmp/project',
			projectRoot: '/tmp/project',
		});
		discoverConfigOptionsMock.mockResolvedValue(['', 'low', 'high']);

		await listEfforts('agent-1', { json: true });

		expect(discoverConfigOptionsMock).toHaveBeenCalledWith('codex', 'reasoningEffort');
		expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(['', 'low', 'high'], null, 2));
	});

	it('uses the configured custom path when discovering options', async () => {
		vi.mocked(getAgentDefinition).mockReturnValue({
			id: 'claude-code',
			name: 'Claude Code',
			modelArgs: () => [],
		} as never);
		vi.mocked(getAgentCustomPath).mockReturnValue('/custom/claude');
		discoverModelsMock.mockResolvedValue(['sonnet']);

		await listModels('agent-1', {});

		expect(setCustomPathsMock).toHaveBeenCalledWith({ 'claude-code': '/custom/claude' });
	});

	it('exits when the agent does not support effort selection', async () => {
		vi.mocked(getAgentDefinition).mockReturnValue({
			id: 'gemini-cli',
			name: 'Gemini CLI',
			configOptions: [{ key: 'model' }],
		} as never);
		vi.mocked(getSessionById).mockReturnValue({
			id: 'agent-1',
			name: 'Agent 1',
			toolType: 'gemini-cli',
			cwd: '/tmp/project',
			projectRoot: '/tmp/project',
		});

		await listEfforts('agent-1', {});

		expect(consoleErrorSpy).toHaveBeenCalled();
		expect(processExitSpy).toHaveBeenCalledWith(1);
	});
});
