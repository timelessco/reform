import { addTodo, listTodos } from "./todos";
import {
	createWorkspace,
	updateWorkspace,
	deleteWorkspace,
	getOrCreateDefaultWorkspace,
	listWorkspaces,
} from "./workspaces";
import {
	createForm,
	updateForm,
	deleteForm,
	bulkInsertForms,
	listForms,
	getForm,
} from "./forms";

export default {
	// Todos
	listTodos,
	addTodo,
	// Workspaces
	createWorkspace,
	updateWorkspace,
	deleteWorkspace,
	getOrCreateDefaultWorkspace,
	listWorkspaces,
	// Forms
	createForm,
	updateForm,
	deleteForm,
	bulkInsertForms,
	listForms,
	getForm,
};
