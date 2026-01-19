import {
	bulkInsertForms,
	createForm,
	deleteForm,
	getForm,
	listForms,
	removeForms,
	syncForms,
	updateForm,
} from "./forms";
import { addTodo, listTodos } from "./todos";
import {
	createWorkspace,
	deleteWorkspace,
	getOrCreateDefaultWorkspace,
	listWorkspaces,
	removeWorkspaces,
	syncWorkspaces,
	updateWorkspace,
} from "./workspaces";

export default {
	listTodos,
	addTodo,
	createWorkspace,
	updateWorkspace,
	deleteWorkspace,
	getOrCreateDefaultWorkspace,
	listWorkspaces,
	syncWorkspaces,
	removeWorkspaces,
	createForm,
	updateForm,
	deleteForm,
	bulkInsertForms,
	listForms,
	getForm,
	syncForms,
	removeForms,
};
